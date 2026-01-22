-- MySQL schema para Controlo de Rações

CREATE TABLE IF NOT EXISTS racoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(32) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  marca VARCHAR(80) NOT NULL,
  variante VARCHAR(80) NULL,
  peso_kg DECIMAL(6,2) NOT NULL,
  fornecedor VARCHAR(120) NULL,
  preco_venda DECIMAL(10,2) NOT NULL,
  stock_minimo INT NOT NULL DEFAULT 0,
  ativo ENUM('SIM','NÃO') NOT NULL DEFAULT 'SIM',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(40) NULL,
  email VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_movimento DATE NOT NULL,
  tipo ENUM('ENTRADA','SAÍDA') NOT NULL,
  motivo ENUM('COMPRA','VENDA','CONSUMO_CASA','AJUSTE') NOT NULL,
  racao_id INT NOT NULL,
  qtd_sacos INT NOT NULL,
  custo_unitario DECIMAL(10,2) NULL,
  preco_venda_unitario DECIMAL(10,2) NULL,
  cliente_id INT NULL,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_racao FOREIGN KEY (racao_id) REFERENCES racoes(id),
  CONSTRAINT fk_mov_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Índices úteis
CREATE INDEX idx_movimentos_racao ON movimentos(racao_id, tipo, motivo);
CREATE INDEX idx_movimentos_data ON movimentos(data_movimento);

-- View para métricas por SKU (stock, custo médio, vendas, lucro)
CREATE OR REPLACE VIEW vw_racoes_metricas AS
SELECT
  r.id,
  r.sku,
  r.nome,
  r.marca,
  r.variante,
  r.peso_kg,
  r.fornecedor,
  r.preco_venda,
  r.stock_minimo,
  r.ativo,
  COALESCE(
    SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.qtd_sacos ELSE 0 END) -
    SUM(CASE WHEN m.tipo = 'SAÍDA' THEN m.qtd_sacos ELSE 0 END),
    0
  ) AS stock_atual,
  -- Custo médio ponderado apenas de compras (entradas)
  CASE
    WHEN SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END) = 0 THEN NULL
    ELSE
      SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos * m.custo_unitario ELSE 0 END) /
      SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END)
  END AS custo_medio,
  -- Valor em stock (custo)
  (CASE
    WHEN SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END) = 0 THEN 0
    ELSE
      (SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.qtd_sacos ELSE 0 END) -
       SUM(CASE WHEN m.tipo = 'SAÍDA' THEN m.qtd_sacos ELSE 0 END)) *
      (SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos * m.custo_unitario ELSE 0 END) /
       SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END))
  END) AS valor_em_stock_custo,
  -- Número de vendas (sacos)
  SUM(CASE WHEN m.tipo = 'SAÍDA' AND m.motivo = 'VENDA' THEN m.qtd_sacos ELSE 0 END) AS num_vendas,
  -- Consumo casa (sacos)
  SUM(CASE WHEN m.tipo = 'SAÍDA' AND m.motivo = 'CONSUMO_CASA' THEN m.qtd_sacos ELSE 0 END) AS consumo_casa,
  -- Lucro total estimado
  (SUM(CASE WHEN m.tipo = 'SAÍDA' AND m.motivo = 'VENDA' THEN m.qtd_sacos * m.preco_venda_unitario ELSE 0 END) -
   (SUM(CASE WHEN m.tipo = 'SAÍDA' AND m.motivo = 'VENDA' THEN m.qtd_sacos ELSE 0 END) *
    CASE
      WHEN SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END) = 0 THEN 0
      ELSE
        SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos * m.custo_unitario ELSE 0 END) /
        SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos ELSE 0 END)
    END
   )) AS lucro_total,
  CASE
    WHEN (SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.qtd_sacos ELSE 0 END) -
          SUM(CASE WHEN m.tipo = 'SAÍDA' THEN m.qtd_sacos ELSE 0 END)) <= r.stock_minimo
    THEN 'BAIXO'
    ELSE 'OK'
  END AS alerta
FROM racoes r
LEFT JOIN movimentos m ON m.racao_id = r.id
GROUP BY r.id;

-- View para dashboard
CREATE OR REPLACE VIEW vw_dashboard AS
SELECT
  COALESCE(SUM(valor_em_stock_custo), 0) AS valor_em_stock,
  COALESCE(SUM(CASE WHEN m.tipo = 'ENTRADA' AND m.motivo = 'COMPRA' THEN m.qtd_sacos * m.custo_unitario ELSE 0 END), 0) AS total_compras,
  COALESCE(SUM(CASE WHEN m.tipo = 'SAÍDA' AND m.motivo = 'VENDA' THEN m.qtd_sacos * m.preco_venda_unitario ELSE 0 END), 0) AS total_vendas,
  COALESCE(SUM(lucro_total), 0) AS lucro_estimado
FROM vw_racoes_metricas vr
LEFT JOIN movimentos m ON m.racao_id = vr.id;
