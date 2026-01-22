INSERT INTO racoes (sku, nome, marca, variante, peso_kg, fornecedor, preco_venda, stock_minimo, ativo)
VALUES
  ('RAC-001', 'Exclusive Fish 3kg', 'Royal Canin', 'Peixe', 3.0, 'Fornecedor A', 29.90, 3, 'SIM'),
  ('RAC-002', 'Junior 12kg', 'Royal Canin', 'Junior', 12.0, 'Fornecedor A', 79.90, 2, 'SIM'),
  ('RAC-003', 'Fish 12kg', 'Royal Canin', 'Peixe', 12.0, 'Fornecedor B', 74.90, 2, 'SIM'),
  ('RAC-004', 'Duck 12kg', 'Royal Canin', 'Pato', 12.0, 'Fornecedor B', 79.90, 2, 'SIM'),
  ('RAC-005', 'Natsbi', 'Natsbi', 'Natural', 15.0, 'Fornecedor C', 89.90, 1, 'SIM');

INSERT INTO movimentos (data_movimento, tipo, motivo, racao_id, qtd_sacos, custo_unitario, preco_venda_unitario, observacoes)
VALUES
  ('2024-01-02', 'ENTRADA', 'COMPRA', 1, 10, 20.00, NULL, 'Stock inicial'),
  ('2024-01-02', 'ENTRADA', 'COMPRA', 2, 5, 55.00, NULL, 'Stock inicial'),
  ('2024-01-10', 'SAÍDA', 'VENDA', 1, 2, NULL, 29.90, 'Venda loja'),
  ('2024-01-15', 'SAÍDA', 'VENDA', 5, 2, NULL, 89.90, 'Cliente habitual'),
  ('2024-01-18', 'SAÍDA', 'CONSUMO_CASA', 1, 1, NULL, NULL, 'Cão de casa');
