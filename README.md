# Controlo de Rações — Website

Este diretório contém uma versão web simples para gerir o processo de controlo de rações.

## Estrutura
- `index.html` — Interface principal.
- `assets/styles.css` — Estilos.
- `app.js` — Lógica frontend (com dados de exemplo quando não existe API).
- `db/schema.sql` — Esquema MySQL coerente com as regras de negócio.
- `db/seed.sql` — Dados de exemplo.

## Como usar (local)
1) Abrir `index.html` no browser.
2) Para dados reais, configurar um backend/API que exponha:
   - `GET /racoes`
   - `GET /movimentos`
   - `GET /dashboard`
   - `POST /racoes`
   - `POST /movimentos`

No ficheiro `app.js`, definir `API_BASE` com o endereço da tua API.

## Regras de negócio suportadas no esquema
- Stock atual = Entradas – Saídas
- Custo médio = média ponderada de compras
- Valor em stock = stock atual * custo médio
- Lucro = receitas de vendas – custo das vendas
- Alerta = stock atual <= stock mínimo

## Próximos passos sugeridos
- Criar endpoints PHP (ou Node) na Hostinger para CRUD.
- Proteger API com autenticação básica.
- Adicionar paginação/filtros para movimentos.
