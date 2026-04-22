# BelezaEcosystem — Setup & Operação

> Guia completo para rodar o projeto localmente, com Docker e em produção.

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 15.x |
| Docker + Compose | 24.x (opcional) |

---

## 2. Variáveis de Ambiente

Copie `.env.example` para `.env` na pasta `backend/`:

```bash
cp backend/.env.example backend/.env
```

### Variáveis obrigatórias

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=belezaecosystem
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# JWT
JWT_SECRET=segredo_muito_longo_e_aleatorio_minimo_32_chars
JWT_REFRESH_SECRET=outro_segredo_refresh_minimo_32_chars
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# App
NODE_ENV=development
PORT=3000

# CORS (separado por vírgula)
CORS_ORIGIN=http://localhost:5173,http://localhost:4173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Variáveis opcionais

```env
# Habilitar Swagger UI em produção (default: false)
ENABLE_DOCS=false

# Logging
LOG_LEVEL=debug
```

---

## 3. Rodando Localmente (sem Docker)

### Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar banco de dados (PostgreSQL deve estar rodando)
createdb belezaecosystem

# Rodar migrations
npm run migrate

# Rodar seeds (dados iniciais)
npm run seed

# Iniciar em modo dev (hot reload)
npm run dev
```

### Frontend

```bash
# Na raiz do projeto
npm install
npm run dev
```

O frontend estará em `http://localhost:5173`  
O backend estará em `http://localhost:3000`

---

## 4. Rodando com Docker

```bash
# Na raiz do projeto
docker compose up --build
```

O `docker-compose.yml` sobe:
- `postgres:15` — banco de dados
- `backend` — API Node.js (porta 3000)
- `frontend` — Vite dev server (porta 5173)

Para rodar migrations dentro do container:

```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

---

## 5. Migrations

```bash
# Aplicar todas as migrations pendentes
npm run migrate

# Desfazer a última migration
npm run migrate:undo

# Desfazer todas as migrations
npx sequelize-cli db:migrate:undo:all

# Criar nova migration
npx sequelize-cli migration:generate --name nome-da-migration
```

As migrations ficam em `backend/src/migrations/`.  
A convenção de nome é `NNN_descricao.js` (ex: `041_phase7_indexes.js`).

---

## 6. Testes

```bash
cd backend

# Todos os testes (unit + integration) com cobertura
npm test

# Apenas unit tests
npm run test:unit

# Apenas integration tests
npm run test:integration

# Watch mode (durante desenvolvimento)
npm run test:watch
```

### Organização dos testes

```
backend/tests/
├── setup.js                          # Env vars de teste (JWT_SECRET, etc.)
├── multi-tenant-isolation.test.js    # Testes de isolamento de tenant (unit)
├── unit/
│   ├── marketing.service.test.js
│   ├── mini-site.service.test.js
│   ├── help.service.test.js
│   └── commissions.service.test.js
└── integration/
    ├── helpers/testApp.js            # Builders de app para testes
    ├── auth.middleware.test.js
    ├── marketing.routes.test.js
    ├── mini-site.routes.test.js
    └── help.routes.test.js
```

> Os testes de integração **não requerem banco de dados real** — usam mocks de models Sequelize.

---

## 7. Documentação da API (Swagger)

Em desenvolvimento, acesse:

```
http://localhost:3000/api/docs
```

Para o JSON bruto (importar no Postman, Insomnia, etc.):

```
http://localhost:3000/api/docs/json
```

Para habilitar em produção, defina `ENABLE_DOCS=true` no `.env`.

---

## 8. Fluxo de Autenticação (Multi-Tenant JWT)

```
1. Cliente envia POST /api/auth/login
   Body: { email, password }
   Header: X-Tenant-Slug: meu-salao

2. API verifica credenciais e retorna:
   { access_token, refresh_token, user }

3. Todas as requisições autenticadas usam:
   Header: Authorization: Bearer <access_token>
   Header: X-Tenant-Slug: meu-salao

4. Quando access_token expirar (1h):
   POST /api/auth/refresh
   Body: { refresh_token }
   → Retorna novo access_token
```

---

## 9. Fluxo Multi-Tenant

Cada salão é um **tenant** identificado pelo `slug` (ex: `meu-salao`).

- O `X-Tenant-Slug` é resolvido pelo `tenantResolver` middleware
- Todos os dados são isolados por `tenant_id` no banco
- Um usuário só acessa dados do seu próprio tenant
- MASTER pode acessar qualquer tenant via `/api/master/`

### Roles (RBAC)

| Role | Permissões |
|---|---|
| `owner` | Acesso total ao tenant |
| `admin` | Acesso gerencial (sem billing) |
| `professional` | Área própria (agenda, comissões) |
| `client` | Sem acesso à API interna |
| `master` | Acesso cross-tenant (SaaS admin) |

---

## 10. Rate Limits

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /api/auth/login` | 20 req | 15 min |
| `POST /api/auth/register` | 20 req | 15 min |
| `POST /api/help/contact` | 5 req/IP | 60 min |
| `/api/marketing/campaigns` (writes) | 30 req | 15 min |
| `/api/ai/*` | 60 req | 15 min |
| `/api/public/mini-site/*` | 60 req | 1 min |
| `/api/*` (global) | 100 req | 15 min |

Além dos rate limits por IP, o `/api/help/contact` tem um **spam guard por email**: máximo 3 submissões/email/hora.

---

## 11. Deploy (Fly.io)

```bash
# Instalar flyctl
# https://fly.io/docs/hands-on/install-flyctl/

# Login
fly auth login

# Deploy
fly deploy

# Variáveis de ambiente em produção
fly secrets set JWT_SECRET=... DB_PASSWORD=... NODE_ENV=production

# Logs em tempo real
fly logs

# SSH no container
fly ssh console
```

O `Dockerfile` está em `backend/Dockerfile`.  
O banco PostgreSQL é gerenciado como Fly Postgres.
