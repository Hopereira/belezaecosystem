# Beleza Ecosystem

Sistema SaaS B2B de gestão para salões de beleza — multi-tenant, full-stack, pronto para produção.

---

## Visão Geral

O **Beleza Ecosystem** é uma plataforma de gestão completa para salões de beleza, oferecida como Software as a Service (SaaS). Cada salão (tenant) tem seu próprio espaço isolado com agendamentos, clientes, financeiro, equipe, marketing, mini-site e muito mais.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vanilla JS ES6, Vite 5 |
| Backend | Node.js 20 LTS, Express 4.21 |
| ORM | Sequelize 6.37 |
| Banco de dados | PostgreSQL 15 |
| Autenticação | JWT (access + refresh token) |
| Validação | Joi |
| Logging | Winston (structured JSON + correlation-id) |
| Testes | Jest + Supertest (133 passando) |
| Deploy backend | Fly.io |
| Deploy frontend | Cloudflare Pages |
| CI/CD | GitHub Actions |
| Reverse proxy | Nginx |
| Containerização | Docker Compose |

---

## Arquitetura Resumida

```
Browser
  └── Cloudflare Pages (dist/)
        └── SPA Vanilla JS (src/)
              └── api.belezaecosystem.com.br (Fly.io)
                    └── Express API (multi-tenant)
                          └── Supabase PostgreSQL 15
```

O backend resolve o tenant a cada request via header `X-Tenant-Slug` ou subdomain. Toda a lógica de negócio fica em módulos por domínio (`src/modules/<domínio>/`).

---

## Módulos Principais

### Frontend (`src/features/`)

| Módulo | Rota | Descrição |
|--------|------|-----------|
| `auth/` | `/login`, `/register` | Autenticação JWT |
| `dashboard/` | `/dashboard` | Visão geral do salão |
| `appointments/` | `/appointments` | Agendamentos |
| `clients/` | `/clients` | Cadastro de clientes |
| `services/` | `/services` | Serviços oferecidos |
| `professionals/` | `/professionals` | CRUD da equipe (OWNER) |
| `professional-area/` | `/professional/*` | Área exclusiva do profissional |
| `financial/` | `/financial` | Entradas e saídas |
| `marketing/` | `/marketing` | Campanhas e automações |
| `ai-assistant/` | `/ai-assistant` | Secretária IA |
| `help/` | `/help` | Central de ajuda |
| `mini-site/` | `/mini-site` | Site público do salão |
| `billing/` | `/billing` | Assinatura SaaS |
| `master/` | `/master/*` | Painel superadmin |
| `inventory/` | `/inventory` | Estoque |
| `suppliers/` | `/suppliers` | Fornecedores |
| `settings/` | `/settings` | Configurações do tenant |
| `account/` | `/account` | Perfil do usuário |

### Backend (`backend/src/modules/`)

| Módulo | Domínio |
|--------|---------|
| `tenants/` | Onboarding e resolução de tenant |
| `users/` | CRUD de usuários |
| `professionals/` | Gestão de profissionais |
| `marketing/` | Campanhas e automações |
| `mini-site/` | Config e publicação |
| `help/` | FAQ e contato (com spam guard) |
| `ai-assistant/` | Interações com IA |
| `commissions/` | Cálculo de comissões (batch N+1 fix) |
| `notifications/` | Sistema de notificações |
| `lgpd/` | Solicitações de exclusão LGPD |
| `billing/` | Planos, assinaturas, pagamentos |
| `financial/` | Financeiro do tenant |
| `inventory/` | Estoque e produtos |
| `suppliers/` | Fornecedores |
| `purchases/` | Compras |

---

## Papéis do Sistema (RBAC)

| Role | Descrição |
|------|-----------|
| `client` | Cliente final (acesso ao mini-site público) |
| `professional` | Profissional do salão (área própria) |
| `admin` | Administrador do tenant |
| `owner` | Dono do salão — acesso completo ao tenant |
| `master` | Superadmin do SaaS — sem tenantId, gerencia todos os tenants |

`authorize()` usa verificação exata de role — sem hierarquia implícita. MASTER opera exclusivamente via `/master/*` routes.

---

## Multi-Tenancy

Cada tenant é identificado por:
- `tenant_id` — UUID único no banco
- `slug` — identificador de URL (ex: `bella-arte`)
- Subdomínio — `bella-arte.belezaecosystem.com.br`

O `tenantResolver` middleware resolve o tenant via header `X-Tenant-Slug` ou subdomain e injeta `req.tenant` + `req.tenantId`.

---

## Billing e Assinatura

- Planos: Free, Pro, Enterprise
- Integração com Pagar.me
- Mock billing disponível em dev (`/api/billing/mock/*`)
- Subscription gate: bloqueia writes em `past_due`, bloqueia tudo em `suspended/cancelled/expired`
- Resposta de erro: HTTP 402 (Payment Required) com `error.code: SUBSCRIPTION_INACTIVE`

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20 LTS
- PostgreSQL 15 (local ou Supabase)
- npm 10+

### Setup

```bash
# 1. Dependências frontend
npm install

# 2. Dependências backend
cd backend && npm install && cd ..

# 3. Configurar variáveis de ambiente
cp .env.example backend/.env
# Editar backend/.env com suas credenciais

# 4. Rodar migrations
cd backend
npx sequelize-cli db:migrate

# 5. (Opcional) Seeds
npx sequelize-cli db:seed:all
cd ..

# 6. Iniciar backend (terminal 1)
cd backend && npm run dev

# 7. Iniciar frontend (terminal 2)
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- Swagger UI: `http://localhost:5001/api/docs`

---

## Como Rodar com Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Logs
docker-compose logs -f backend

# Parar
docker-compose down
```

Para produção:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Variáveis de Ambiente

Copie `.env.example` para `backend/.env`:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | URL completa do PostgreSQL |
| `JWT_SECRET` | ✅ | Secret JWT (mín. 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Secret refresh token (mín. 32 chars) |
| `NODE_ENV` | ✅ | `development`, `test` ou `production` |
| `PORT` | — | Porta do backend (padrão: 5001) |
| `CORS_ORIGIN` | ✅ | Origins permitidas (vírgula separado) |
| `PAGARME_API_KEY` | — | Chave Pagar.me (produção) |
| `ENABLE_DOCS` | — | `true` para ativar Swagger em produção |

---

## Migrations e Seeders

```bash
# Rodar migrations pendentes
cd backend
npx sequelize-cli db:migrate

# Reverter última
npx sequelize-cli db:migrate:undo

# Rodar seeds
npx sequelize-cli db:seed:all
```

41 migrations em `backend/src/migrations/` — numeradas sequencialmente de `001` a `041`.

---

## Scripts Principais

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Frontend com HMR (Vite) |
| `npm run build` | Build de produção do frontend |
| `cd backend && npm run dev` | Backend com hot-reload (nodemon) |
| `cd backend && npm test` | Todos os testes com coverage |
| `cd backend && npm run test:unit` | Apenas testes unitários |
| `cd backend && npm run test:integration` | Apenas testes de integração |
| `script/start.ps1` | Inicia todos os serviços Docker (Windows) |
| `script/stop.ps1` | Para todos os serviços Docker |
| `script/reset.ps1` | Reset completo (remove volumes) |
| `script/logs.ps1` | Ver logs dos containers |

---

## Estrutura de Pastas

```
belezaecosystem/
├── README.md
├── index.html                    # SPA entry point
├── vite.config.js
├── package.json                  # Deps frontend
├── docker-compose.yml            # Dev stack
├── docker-compose.prod.yml       # Prod stack
├── fly.toml                      # Deploy Fly.io
├── .env.example
│
├── src/                          # Frontend SPA
│   ├── main.js
│   ├── core/                     # router, state, auth, config
│   ├── shared/
│   │   ├── components/           # shell, modal, subscription-banner
│   │   ├── styles/               # main.css, components.css, modules.css, billing.css
│   │   └── utils/                # http, api-mappers, validation, toast, localStorage
│   └── features/
│       ├── auth/
│       ├── dashboard/
│       ├── professional-area/    # Área do Profissional (role: professional)
│       ├── professionals/        # CRUD equipe (role: owner/admin)
│       ├── marketing/
│       ├── ai-assistant/
│       ├── help/
│       ├── mini-site/
│       ├── master/               # Painel MASTER
│       ├── billing/
│       ├── financial/
│       ├── clients/
│       ├── appointments/
│       ├── services/
│       ├── inventory/
│       ├── suppliers/
│       ├── purchases/
│       ├── reports/
│       ├── settings/
│       ├── account/
│       ├── users/
│       └── public/               # Landing pública, políticas, termos
│
├── backend/
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── app.multitenant.js    # App Express principal
│       ├── config/               # env.js, database.js
│       ├── models/               # 17 Sequelize models
│       ├── migrations/           # 41 migrations
│       ├── seeders/              # Seeds de planos e master user
│       ├── controllers/          # authController, professionalAreaController
│       ├── routes/               # auth.js, professionalArea.js, owner/
│       ├── modules/              # 21 módulos de domínio
│       ├── docs/                 # swagger.js (OpenAPI 3.0)
│       ├── shared/
│       │   ├── middleware/       # auth, errorHandler, rateLimits, tenantResolver...
│       │   ├── utils/            # jwt, logger
│       │   ├── errors/           # AppError e subclasses
│       │   └── constants/        # ROLES, ERROR_CODES, PAGINATION...
│       ├── middleware/           # aliases → shared/middleware (legado)
│       └── utils/                # aliases → shared/utils (legado)
│
├── docs/                         # Documentação técnica
│   ├── ARCHITECTURE_LIVE.md      # Arquitetura atual + status produção
│   ├── setup.md                  # Guia de setup completo
│   ├── integracao-api.md         # Mapa de endpoints e contratos
│   ├── modelagem-novos-modulos.md
│   ├── decisoes-tecnicas.md      # Decisões arquiteturais e justificativas
│   ├── auditoria-arquitetural-final.md
│   ├── brand-system.md
│   ├── components.md
│   ├── MULTI_TENANT_ARCHITECTURE.md
│   ├── PAGARME_INTEGRATION.md
│   └── API_DOCUMENTATION.md
│
├── script/                       # Scripts operacionais (bat + ps1 + sh)
├── nginx/                        # nginx.conf
├── postgres/                     # Init scripts PostgreSQL
└── archive/                      # Arquivos históricos (não ativos)
    ├── CHANGELOG.md
    └── beatriz/                  # Mini-site cliente externo (arquivado)
```

---

## Documentação Complementar

| Documento | Descrição |
|-----------|-----------|
| `docs/ARCHITECTURE_LIVE.md` | Arquitetura de produção, domínios, CI/CD, status |
| `docs/setup.md` | Setup dev, Docker, Fly.io, migrations, testes |
| `docs/integracao-api.md` | Endpoints, contratos, rate limits, exemplos |
| `docs/modelagem-novos-modulos.md` | Schema tabelas Phase 6/7 |
| `docs/decisoes-tecnicas.md` | Decisões arquiteturais com justificativa |
| `docs/auditoria-arquitetural-final.md` | Auditoria completa do código-base |
| `docs/brand-system.md` | Design tokens, fontes, paleta de cores |
| `docs/components.md` | Componentes compartilhados do frontend |
| `docs/MULTI_TENANT_ARCHITECTURE.md` | Detalhe da multi-tenancy |
| `docs/PAGARME_INTEGRATION.md` | Integração Pagar.me |
| `docs/API_DOCUMENTATION.md` | Referência completa da API REST |

---

## Status do Projeto

| Fase | Descrição | Status |
|------|-----------|--------|
| 1–3 | Design system, shell, componentes | ✅ |
| 4 | Dashboard, Onboarding, Landing | ✅ |
| 5 | Marketing, IA, Ajuda, Mini-site, Comissões | ✅ |
| 6 | Backend real dos módulos Fase 5 | ✅ |
| 7 | Migrations, índices, validação, contratos | ✅ |
| 8 | Testes (133), Swagger, rate limits, observabilidade | ✅ |
| 9 | Auditoria arquitetural, limpeza, README | ✅ |

**Próximos passos:**
- CORS wildcard para subdomínios de tenants (`*.belezaecosystem.com.br`)
- Integração Resend (emails transacionais: registro, reset)
- Redis para cache de tenant em deploy multi-instância
- CSP (Content Security Policy) via Helmet
- CI: configurar secrets `JWT_SECRET` + `NODE_ENV=test` para testes automáticos

---

## Boas Práticas para Contribuição

- Nunca colocar lógica de negócio em controllers — sempre em services
- Toda nova rota pública deve ter rate limiter em `shared/middleware/rateLimits.js`
- Todo novo endpoint precisa de entrada em `docs/integracao-api.md`
- Toda decisão arquitetural relevante vai em `docs/decisoes-tecnicas.md`
- Rodar `npm test` antes de qualquer merge para `master`
- Migrations numeradas sequencialmente: `042_...`, `043_...`
- Seeds devem ser idempotentes (`ignoreDuplicates: true`)
- `ENABLE_DOCS=false` em produção (exceto quando explicitamente habilitado)
