# Integração Frontend ↔ Backend — Beleza Ecosystem

> Documento de referência para endpoints ativos, estrutura de autenticação e mapeamento de módulos.

---

## Stack

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Frontend   | Vanilla JS (ES6), Vite 5, CSS puro  |
| Backend    | Node.js 20 + Express 4.21           |
| ORM        | Sequelize 6.37 + PostgreSQL 15      |
| Auth       | JWT (access + refresh tokens)       |
| Deploy     | Docker + Fly.io / Cloudflare        |

---

## Autenticação

Todos os endpoints protegidos exigem o header:

```
Authorization: Bearer <access_token>
```

Rotas multi-tenant exigem também:

```
X-Tenant-Slug: <slug_do_estabelecimento>
```

### Endpoints de Auth (`/api/auth`)

| Método | Rota                  | Descrição                        |
|--------|-----------------------|----------------------------------|
| POST   | `/api/auth/register`  | Cadastro de novo usuário         |
| POST   | `/api/auth/login`     | Login (retorna access + refresh) |
| POST   | `/api/auth/refresh-token` | Renova access token          |
| GET    | `/api/auth/me`        | Retorna usuário autenticado      |

---

## Rotas Públicas

| Método | Rota                        | Descrição                        |
|--------|-----------------------------|----------------------------------|
| GET    | `/api/health`               | Health check da API              |
| GET    | `/api/health/schema`        | Verifica tabelas críticas no DB  |
| GET    | `/api/billing/plans`        | Lista planos de assinatura ativos |
| GET    | `/api/billing/plans/:slug`  | Detalhe de um plano              |
| POST   | `/api/onboarding/register`  | Self-signup de novo tenant       |

---

## Área Professional (`/api/professional`)

> Role obrigatória: `PROFESSIONAL` | Assinatura ativa obrigatória

| Método | Rota                              | Descrição                         |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/api/professional/dashboard`     | Métricas do profissional          |
| GET    | `/api/professional/appointments`  | Agendamentos (paginado + filtros) |
| GET    | `/api/professional/clients`       | Clientes atendidos pelo profissional |
| GET    | `/api/professional/earnings`      | Ganhos/comissões                  |
| GET    | `/api/professional/performance`   | Estatísticas de performance       |
| GET    | `/api/professional/profile`       | Perfil do profissional            |
| PUT    | `/api/professional/profile`       | Atualizar perfil (phone, avatar)  |
| GET    | `/api/professional/availability`  | Disponibilidade                   |
| PUT    | `/api/professional/availability`  | Atualizar disponibilidade         |

---

## Área Owner/Admin (`/api/*`)

> Roles obrigatórias: `OWNER` ou `ADMIN` | Assinatura ativa obrigatória

### Serviços

| Método | Rota               | Descrição                   |
|--------|--------------------|-----------------------------|
| GET    | `/api/services`    | Listar serviços (paginado)  |
| POST   | `/api/services`    | Criar serviço               |
| PUT    | `/api/services/:id`| Atualizar serviço           |
| DELETE | `/api/services/:id`| Remover serviço             |

### Clientes

| Método | Rota              | Descrição                   |
|--------|-------------------|-----------------------------|
| GET    | `/api/clients`    | Listar clientes (paginado)  |
| POST   | `/api/clients`    | Criar cliente               |
| PUT    | `/api/clients/:id`| Atualizar cliente           |
| DELETE | `/api/clients/:id`| Remover cliente             |

### Agendamentos

| Método | Rota                    | Descrição                        |
|--------|-------------------------|----------------------------------|
| GET    | `/api/appointments`     | Listar agendamentos (paginado)   |
| POST   | `/api/appointments`     | Criar agendamento                |
| PUT    | `/api/appointments/:id` | Atualizar agendamento            |
| DELETE | `/api/appointments/:id` | Cancelar agendamento             |

### Profissionais

| Método | Rota                      | Descrição                   |
|--------|---------------------------|-----------------------------|
| GET    | `/api/professionals`      | Listar profissionais        |
| POST   | `/api/professionals`      | Criar profissional          |
| PUT    | `/api/professionals/:id`  | Atualizar profissional      |
| DELETE | `/api/professionals/:id`  | Remover profissional        |
| GET    | `/api/professional-details` | Detalhes especializados   |

### Financeiro

| Método | Rota                           | Descrição                        |
|--------|--------------------------------|----------------------------------|
| GET    | `/api/financial`               | Lançamentos financeiros          |
| POST   | `/api/financial`               | Criar lançamento                 |
| GET    | `/api/payment-transactions`    | Transações de pagamento          |

### Relatórios

| Método | Rota           | Descrição                        |
|--------|----------------|----------------------------------|
| GET    | `/api/reports` | Relatórios consolidados          |

### Estoque / Fornecedores / Compras

| Método | Rota               | Descrição         |
|--------|--------------------|-------------------|
| GET    | `/api/products`    | Produtos/estoque  |
| GET    | `/api/suppliers`   | Fornecedores      |
| GET    | `/api/purchases`   | Compras           |

---

## Área Master (`/api/master`)

> Role obrigatória: `MASTER` (admin do SaaS)

| Método | Rota                        | Descrição                      |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/master/tenants`       | Listar todos os tenants        |
| GET    | `/api/master/billing`       | MRR, planos, assinaturas       |
| GET    | `/api/master/lgpd`          | Auditoria LGPD global          |

---

## Tenant / Usuários / Perfil

| Método | Rota            | Descrição                          |
|--------|-----------------|------------------------------------|
| GET    | `/api/tenant`   | Info do tenant atual               |
| GET    | `/api/users`    | Usuários do tenant (admin)         |
| GET    | `/api/profile`  | Perfil do usuário autenticado      |
| PUT    | `/api/profile`  | Atualizar perfil                   |

---

## Conformidade LGPD

| Método | Rota               | Descrição                       |
|--------|--------------------|---------------------------------|
| GET    | `/api/lgpd`        | Dados pessoais do usuário       |
| DELETE | `/api/lgpd`        | Solicitação de exclusão (Art.18)|

---

## Estrutura de Resposta Padrão

```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso.",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### Erros

```json
{
  "success": false,
  "message": "Mensagem de erro legível.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [ ... ]
  }
}
```

---

## Mapeamento Frontend → Backend

| Página Frontend                        | Endpoint Principal                     |
|----------------------------------------|----------------------------------------|
| `dashboard/pages/dashboard.js`         | `GET /api/professional/dashboard`      |
| `professional/pages/appointments.js`   | `GET /api/professional/appointments`   |
| `professional/pages/clients.js`        | `GET /api/professional/clients`        |
| `professional/pages/earnings.js`       | `GET /api/professional/earnings`       |
| `professional/pages/performance.js`    | `GET /api/professional/performance`    |
| `professional/pages/profile.js`        | `GET/PUT /api/professional/profile`    |
| `professional/pages/availability.js`   | `GET/PUT /api/professional/availability` |
| `clients/pages/clients.js`             | `GET/POST /api/clients`                |
| `appointments/pages/appointments.js`   | `GET/POST /api/appointments`           |
| `financial/pages/financial.js`         | `GET/POST /api/financial`              |
| `reports/pages/reports.js`             | `GET /api/reports`                     |
| `billing/pages/onboarding.js`          | `GET /api/billing/plans`               |
| `master/dashboard/master-dashboard.js` | `GET /api/master/tenants`              |
| `auth/pages/login.js`                  | `POST /api/auth/login`                 |
| `auth/pages/register.js`               | `POST /api/auth/register`              |

---

## Rate Limits

| Escopo               | Limite         |
|----------------------|----------------|
| Global (`/api/`)     | 100 req/15min  |
| Login (`/api/auth/login`) | 20 req/15min |
| Register             | 20 req/15min   |

---

---

## Módulos Phase 6/7 — Endpoints Detalhados

### Marketing (`/api/marketing`) — OWNER/ADMIN

| Método   | Endpoint                            | Descrição                          |
|----------|-------------------------------------|------------------------------------|
| `GET`    | `/marketing/metrics`                | KPIs: campanhas ativas, enviados, automações, open_rate |
| `GET`    | `/marketing/campaigns`              | Lista com filtros + paginação      |
| `POST`   | `/marketing/campaigns`              | Cria campanha (status: draft)      |
| `PATCH`  | `/marketing/campaigns/:id`          | Atualiza campanha (draft/paused)   |
| `GET`    | `/marketing/automations`            | Lista automações (seed no 1º acesso) |
| `PATCH`  | `/marketing/automations/:id/toggle` | Ativa/desativa automação           |

**Query params `GET /marketing/campaigns`:**
```
page, limit, status, channel, search, startDate, endDate, sortBy, sortOrder
```

**Resposta padrão:**
```json
{ "success": true, "data": [...], "meta": { "total", "page", "limit", "pages", "has_more" } }
```

---

### AI Assistant (`/api/ai`) — OWNER/ADMIN/PROFESSIONAL

| Método | Endpoint            | Descrição                                     |
|--------|---------------------|-----------------------------------------------|
| `GET`  | `/ai/status`        | Status derivado (agendamentos hoje, pendentes) |
| `GET`  | `/ai/interactions`  | Paginação de agendamentos como interações      |
| `GET`  | `/ai/suggestions`   | Sugestões derivadas de dados reais             |

**Query params `GET /ai/interactions`:**
```
page, limit, status (CONFIRMED|COMPLETED|CANCELLED|NO_SHOW|PENDING), startDate, endDate, sortOrder
```

---

### Mini-site (`/api/mini-site`) — OWNER/ADMIN

| Método | Endpoint               | Descrição                          |
|--------|------------------------|------------------------------------|
| `GET`  | `/mini-site`           | Configuração do site do tenant     |
| `PATCH`| `/mini-site`           | Atualiza configuração (sanitizado) |
| `POST` | `/mini-site/publish`   | Publica (requer title preenchido)  |
| `POST` | `/mini-site/unpublish` | Despublica                         |
| `GET`  | `/public/mini-site/:slug` | **Público** — retorna site publicado |

**Regras de slug:**
- Padrão: `[a-z0-9][a-z0-9-]{2,59}` (3–60 chars)
- Slugs reservados bloqueados: `api`, `admin`, `login`, etc.
- Unicidade global (única por banco)

---

### Comissões (`/api/professionals`) — OWNER/ADMIN

| Método | Endpoint                           | Descrição                                  |
|--------|------------------------------------|--------------------------------------------|
| `GET`  | `/professionals/commissions`       | Resumo por período (todos os profissionais) |
| `GET`  | `/professionals/:id/commissions`   | Detalhe de um profissional                 |
| `GET`  | `/professionals/performance`       | Ranking por receita                        |

**Query params:** `period=week|month|year`

**Fonte de taxa de comissão (prioridade):**
1. `commission_settings.rate` (ativo para o user_id do profissional)
2. `professional.commission_rate`
3. Default: 30%

---

### Help (`/api/help`) — público (GET) / autenticado (POST)

| Método | Endpoint           | Auth | Descrição                  |
|--------|--------------------|------|----------------------------|
| `GET`  | `/help/categories` | ❌   | Categorias de ajuda        |
| `GET`  | `/help/faq`        | ❌   | FAQ (filtro: `?category=`) |
| `POST` | `/help/contact`    | ✅   | Envio de mensagem          |

**Rate-limit interno:** 3 submissões por e-mail por hora (ValidationError)

**Categorias válidas:** `start`, `appts`, `clients`, `finance`, `billing`, `team`, `marketing`, `account`

---

## Novas tabelas — Phase 6/7

| Tabela                   | Chave tenant | Soft-delete | Notas                                       |
|--------------------------|-------------|-------------|---------------------------------------------|
| `marketing_campaigns`    | ✅           | ❌          | + idx: channel, created_at, scheduled_at    |
| `marketing_automations`  | ✅           | ❌          | Unique: (tenant_id, slug)                   |
| `mini_site_configs`      | ✅ (único)   | ❌          | Unique: slug global; `published_at` track   |
| `help_contact_requests`  | ✅ (nullable)| ❌          | + idx: email+created_at (anti-spam)         |
| `commission_settings`    | ✅           | ✅ (paranoid)| rate, type (percentage/fixed/hybrid), active|

---

*Última atualização: Fase 7 — Consolidação de persistência.*
