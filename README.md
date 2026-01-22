# Controlo de Rações — Website

Website simples para gestão de rações, movimentos e dashboard. Inclui schema MySQL e uma API PHP leve.

## Estrutura
- `index.html` — Interface principal.
- `assets/styles.css` — Estilos.
- `app.js` — Lógica frontend (usa API se configurada).
- `db/schema.sql` — Esquema MySQL com views das métricas.
- `db/seed.sql` — Dados de exemplo.
- `api/` — API PHP (GET/POST para racoes, movimentos e dashboard).

## Instalação (Hostinger)
1) Importa `db/schema.sql` na tua base de dados.
2) (Opcional) Importa `db/seed.sql` para dados de teste.
3) Cria `api/config.php` com os dados reais de ligação (usa `api/config.sample.php` como base).
4) Em `app.js`, define `API_BASE` com o URL da API. Exemplo:
   - `https://teu-dominio.com/api`

## Endpoints
- `GET /api/health`
- `GET /api/racoes`
- `GET /api/movimentos`
- `GET /api/dashboard`
- `POST /api/racoes`
- `POST /api/movimentos`

## Regras de negócio (principais)
- Stock atual = Entradas – Saídas
- Custo médio = média ponderada de compras
- Valor em stock = stock atual * custo médio
- Lucro = receitas de vendas – custo das vendas
- Alerta = stock atual <= stock mínimo

## Segurança
- `api/config.php` está no `.gitignore` e não deve ser enviado para o GitHub.
- Para produção, recomenda-se restringir CORS e adicionar autenticação.
