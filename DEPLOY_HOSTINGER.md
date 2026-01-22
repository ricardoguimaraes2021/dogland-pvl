# Deploy na Hostinger (GitHub Auto Deploy)

## 1) Base de dados
1. Abre o phpMyAdmin na Hostinger.
2. Importa `db/schema.sql`.
3. (Opcional) Importa `db/seed.sql` para dados de teste.

## 2) Configurar API
1. Cria `api/config.php` no servidor com base em `api/config.sample.php`.
2. Preenche os dados reais:
   - host: `srv936.hstgr.io`
   - port: `3306`
   - name: `u758421840_dogland`
   - user: `u758421840_dogland`
   - pass: a tua password real

## 3) Configurar frontend
No `app.js`, define `API_BASE` com o teu domínio, por exemplo:
```
https://dimgrey-cattle-295935.hostingersite.com/api
```

## 4) Testes rápidos
- `GET /api/health`
- `GET /api/racoes`
- `GET /api/movimentos`
- `GET /api/dashboard`

## 5) Nota sobre segurança
- `api/config.php` está no `.gitignore` e não deve ser enviado ao GitHub.
- Para produção, recomenda-se restringir CORS e adicionar autenticação.
