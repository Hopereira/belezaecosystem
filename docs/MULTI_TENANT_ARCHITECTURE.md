# Arquitetura Multi-Tenant — Beleza Ecosystem SaaS

Este documento descreve a arquitetura multi-tenant do Beleza Ecosystem, incluindo decisões arquiteturais, padrões de código e estratégias de escalabilidade.

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MASTER (SaaS Owner)                             │
│  • Gerencia todos os Tenants                                                │
│  • Gerencia Planos de Assinatura                                            │
│  • Dashboard global de métricas                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANTS (Estabelecimentos)                          │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ beleza-pura  │  │  studio-ana  │  │  salao-top   │  │   spa-zen    │    │
│  │   (ACTIVE)   │  │   (TRIAL)    │  │  (SUSPENDED) │  │  (PENDING)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DENTRO DE CADA TENANT                             │
│                                                                             │
│  Users ─► Professionals ─► Services ─► Appointments ─► Financial           │
│    │                                         │              │               │
│    ▼                                         ▼              ▼               │
│  Clients ◄──────────────────────────────────►         Commissions          │
│                                                        PaymentSplits        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estratégia Multi-Tenant

### Decisão: Single Database + Shared Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL (Single Database)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Shared Schema (public)                        │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   tenants   │  │subscription_│  │   users     │                  │   │
│  │  │             │  │    plans    │  │ (tenant_id) │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   clients   │  │appointments │  │  financial  │                  │   │
│  │  │ (tenant_id) │  │ (tenant_id) │  │ (tenant_id) │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Justificativa:**

| Aspecto | Single DB + Shared Schema | Schema per Tenant | Database per Tenant |
|---------|---------------------------|-------------------|---------------------|
| Complexidade | ✅ Baixa | Média | Alta |
| Custo infra | ✅ Baixo | Médio | Alto |
| Isolamento | Lógico | Forte | Máximo |
| Migrations | ✅ Única | Por tenant | Por tenant |
| Escalabilidade | Até ~10k tenants | Até ~1k schemas | Ilimitado |
| Cross-tenant queries | ✅ Fácil | Possível | Difícil |

**Para o Beleza Ecosystem:** Single DB + Shared Schema é ideal para a fase inicial e suporta até 10.000 tenants. Preparamos para migração futura.

---

## 📁 Estrutura de Pastas (Modular)

```
backend/src/
├── app.multitenant.js          # Entry point multi-tenant
├── config/                     # Configurações (env, database)
│
├── modules/                    # Módulos de domínio
│   ├── index.js                # Inicializador de módulos
│   │
│   ├── tenants/                # Módulo de Tenants
│   │   ├── tenant.model.js
│   │   ├── tenant.repository.js
│   │   ├── tenant.service.js
│   │   ├── tenant.controller.js
│   │   ├── tenant.routes.js
│   │   ├── tenant.validation.js
│   │   ├── index.js
│   │   ├── migrations/
│   │   └── seeders/
│   │
│   ├── billing/                # Módulo de Billing (SaaS)
│   │   ├── index.js            # Entry point completo
│   │   ├── BILLING_SYSTEM.md   # Documentação
│   │   ├── controllers/        # billing, master, webhook
│   │   ├── services/           # plan, subscription, invoice, audit
│   │   ├── providers/          # PaymentProvider interface + Stripe/Mock
│   │   ├── middleware/         # requireActiveSubscription
│   │   ├── routes/             # billing, master, webhook routes
│   │   ├── validation/         # Joi schemas
│   │   ├── jobs/               # Billing jobs automatizados
│   │   ├── migrations/
│   │   └── seeders/
│   │
│   ├── users/                  # Módulo de Usuários (Multi-Tenant)
│   │   ├── user.model.js
│   │   ├── user.repository.js
│   │   ├── user.service.js
│   │   ├── user.controller.js
│   │   ├── user.routes.js
│   │   ├── user.validation.js
│   │   ├── index.js
│   │   └── migrations/
│   │
│   └── ... (outros módulos)
│
└── shared/                     # Código compartilhado
    ├── constants/              # Enums e constantes
    │   └── index.js
    │
    ├── database/               # Database utilities
    │   ├── connection.js       # Sequelize instance
    │   ├── BaseRepository.js   # Repository com tenant scope
    │   └── index.js
    │
    ├── errors/                 # Error classes
    │   ├── AppError.js
    │   └── index.js
    │
    ├── middleware/             # Express middleware
    │   ├── auth.js             # JWT + RBAC
    │   ├── tenantResolver.js   # Resolve tenant por subdomain/header
    │   ├── errorHandler.js     # Global error handler
    │   ├── validation.js       # Joi validation
    │   └── index.js
    │
    └── utils/                  # Utilities
        ├── logger.js           # Winston logger com tenant context
        ├── jwt.js              # JWT com tenant_id
        └── index.js
```

---

## 🔐 RBAC (Role-Based Access Control)

### Hierarquia de Roles

```
MASTER (tenant_id: null)
   │
   ├── Acesso total ao SaaS
   ├── Gerencia todos os tenants
   └── Pode acessar qualquer tenant via header X-Tenant-Slug

OWNER (tenant_id: uuid)
   │
   ├── Proprietário do tenant
   ├── Gerencia assinatura e billing
   ├── Pode criar/remover ADMIN
   └── Não pode ser deletado

ADMIN (tenant_id: uuid)
   │
   ├── Administrador do tenant
   ├── Gerencia usuários, profissionais, serviços
   └── Não pode alterar roles >= sua

PROFESSIONAL (tenant_id: uuid)
   │
   ├── Profissional do estabelecimento
   ├── Acessa agenda própria
   └── Visualiza clientes atendidos

CLIENT (tenant_id: uuid)
   │
   ├── Cliente do estabelecimento
   └── Acessa agendamentos próprios
```

### Implementação

```javascript
// shared/middleware/auth.js
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
    
    // Hierarquia: roles superiores têm acesso
    const hasAccess = allowedRoles.some(role => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(role);
      return userRoleIndex >= requiredIndex;
    });
    
    if (!hasAccess) {
      throw new ForbiddenError();
    }
    next();
  };
}
```

---

## 🏢 Tenant Resolution

### Fluxo de Resolução

```
Request chega
     │
     ▼
┌─────────────────────────────────────────┐
│ 1. Header X-Tenant-Slug presente?       │
│    → Usa header (API clients)           │
└─────────────────────────────────────────┘
     │ Não
     ▼
┌─────────────────────────────────────────┐
│ 2. Subdomain presente?                  │
│    → beleza-pura.BelezaEcosystem.com          │
│    → Extrai "beleza-pura"               │
└─────────────────────────────────────────┘
     │ Não
     ▼
┌─────────────────────────────────────────┐
│ 3. JWT tem tenantId?                    │
│    → Usa tenantId do token              │
└─────────────────────────────────────────┘
     │ Não
     ▼
┌─────────────────────────────────────────┐
│ 4. Query param ?tenant= (dev only)      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Busca tenant no banco (com cache 1min)  │
│ Valida status (não pode ser SUSPENDED)  │
│ Injeta req.tenant e req.tenantId        │
└─────────────────────────────────────────┘
```

---

## 📊 Diagrama Relacional (Resumido)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ subscription_   │       │     tenants     │       │     users       │
│     plans       │       │                 │       │                 │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │◄──────│ tenant_id (FK)  │
│ name            │       │ slug (unique)   │       │ id (PK)         │
│ slug            │       │ name            │       │ email           │
│ price           │       │ email           │       │ password        │
│ limits (jsonb)  │       │ document        │       │ role (enum)     │
│ features[]      │       │ status (enum)   │       │ is_active       │
│ trial_days      │       │ settings (jsonb)│       │ settings (jsonb)│
└────────┬────────┘       │ owner_id (FK) ──────────│                 │
         │                └────────┬────────┘       └─────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  subscriptions  │       │    invoices     │       │   usage_logs    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ tenant_id (FK)  │       │ tenant_id (FK)  │       │ tenant_id (FK)  │
│ plan_id (FK)    │       │ subscription_id │       │ metric          │
│ status (enum)   │       │ number (unique) │       │ quantity        │
│ trial_ends_at   │       │ status (enum)   │       │ period_start    │
│ current_period_ │       │ total           │       │ recorded_at     │
│ plan_snapshot   │       │ items (jsonb)   │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 🔄 Fluxo de Criação de Tenant

```
1. MASTER cria tenant via POST /api/master/tenants
     │
     ▼
2. Tenant criado com status: PENDING
     │
     ▼
3. MASTER cria usuário OWNER para o tenant
     │
     ▼
4. Tenant.owner_id = owner.id
     │
     ▼
5. Subscription criada (trial de X dias)
     │
     ▼
6. MASTER ativa tenant → status: ACTIVE
     │
     ▼
7. OWNER recebe email de boas-vindas
     │
     ▼
8. OWNER faz login em slug.BelezaEcosystem.com
```

---

## ⚡ Preparação para Escalabilidade

### Redis Cache (Preparado)

```javascript
// Tenant cache no tenantResolver.js (in-memory por enquanto)
const tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minuto

// Migrar para Redis:
// const redis = require('ioredis');
// await redis.setex(`tenant:${slug}`, 60, JSON.stringify(tenant));
```

### Fila de Jobs (Preparado)

```javascript
// Estrutura preparada para BullMQ
// modules/notifications/jobs/
// - sendEmail.job.js
// - sendSMS.job.js
// - generateInvoice.job.js
```

### Storage S3 (Preparado)

```javascript
// shared/utils/storage.js (abstração)
// - uploadAvatar(tenantId, userId, file)
// - uploadDocument(tenantId, clientId, file)
// - getSignedUrl(key)
```

### Feature Flags por Plano

```javascript
// Verificação de feature
const plan = await subscription.getPlan();
if (!plan.hasFeature(PLAN_FEATURES.REPORTS)) {
  throw new FeatureNotAvailableError('reports');
}
```

---

## 🚀 Comandos Docker

### Iniciar ambiente

```bash
# Copiar variáveis
cp .env.example .env

# Subir containers
docker-compose up -d

# Executar migrations (ordem importa!)
docker exec BelezaEcosystem_backend npx sequelize-cli db:migrate

# Executar seeds
docker exec BelezaEcosystem_backend npx sequelize-cli db:seed:all
```

### Migrations Manuais

```bash
# Criar migration
docker exec BelezaEcosystem_backend npx sequelize-cli migration:generate --name add_feature_x

# Desfazer última migration
docker exec BelezaEcosystem_backend npx sequelize-cli db:migrate:undo

# Desfazer todas
docker exec BelezaEcosystem_backend npx sequelize-cli db:migrate:undo:all
```

---

## 📈 Estratégia para 10k Tenants

### Fase 1: Atual (até 1k tenants)
- Single DB + Shared Schema
- Redis cache para tenants
- Índices otimizados (tenant_id em todas as tabelas)

### Fase 2: Crescimento (1k - 5k tenants)
- Read replicas para queries de leitura
- Connection pooling otimizado (PgBouncer)
- Particionamento de tabelas por data (appointments, financial)

### Fase 3: Escala (5k - 10k tenants)
- Sharding por tenant (grupos de tenants em databases separados)
- Serviço de roteamento de tenant
- CDN para assets estáticos

### Fase 4: Enterprise (10k+ tenants)
- Schema per tenant para grandes clientes
- Database per tenant para enterprise
- Kubernetes para orquestração

---

## 💳 Sistema de Billing

O sistema de billing do Beleza Ecosystem suporta planos mensais e anuais com múltiplos métodos de pagamento.

### Planos Oficiais

| Plano | Mensal | Anual (-15%) | Trial | Profissionais | Agendamentos/mês |
|-------|--------|--------------|-------|---------------|------------------|
| Starter | R$ 0 | R$ 0 | 30 dias | 1 | 100 |
| Growth | R$ 29,90 | R$ 305 | 7 dias | 3 | 500 |
| Professional | R$ 59,90 | R$ 611 | 7 dias | 10 | 2.000 |
| Enterprise | R$ 99,90 | R$ 1.019 | 14 dias | ∞ | ∞ |

### Fluxo de Assinatura

```
Tenant criado → TRIAL (30 dias)
       │
       ▼
Trial expira → PAST_DUE (grace period 7 dias)
       │
       ├── Pagamento OK → ACTIVE
       │
       └── 7 dias sem pagar → SUSPENDED (somente leitura)
               │
               └── 30 dias → CANCELLED
```

### Métodos de Pagamento

- **Cartão (recorrente)**: Cobrança automática via Stripe
- **PIX**: Pagamento único com QR Code (24h de validade)

### Middleware de Bloqueio

```javascript
// Bloqueia operações de escrita para assinaturas inativas
app.use('/api/appointments', requireActiveSubscription());

// Permite leitura, bloqueia escrita
app.use('/api/clients', requireActiveSubscription({ allowRead: true }));

// Verifica feature específica do plano
app.use('/api/reports', requireFeature('reports'));
```

### Documentação Completa

Veja [BILLING_SYSTEM.md](../backend/src/modules/billing/BILLING_SYSTEM.md) para:
- Endpoints completos
- Webhook strategy
- Jobs automáticos
- Checklist de produção

---

## ✅ Credenciais de Teste

| Role | Email | Senha | Tenant |
|------|-------|-------|--------|
| MASTER | master@BelezaEcosystem.com | 123456 | - (global) |
| OWNER | owner@belezapura.com | 123456 | beleza-pura |
| ADMIN | admin@belezapura.com | 123456 | beleza-pura |
| PROFESSIONAL | prof@belezapura.com | 123456 | beleza-pura |

---

## 📝 Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Multi-tenancy | Shared Schema | Simplicidade, custo, escalabilidade inicial |
| Primary Keys | UUID v4 | Evita colisões, permite merge de dados |
| Soft Delete | Paranoid: true | Auditoria, recuperação de dados |
| Timestamps | underscored | Padrão PostgreSQL |
| RBAC | Hierárquico | Simplifica verificações de permissão |
| Tenant Resolution | Subdomain + Header | Flexibilidade para SPA e API |
| JWT | Access + Refresh | Segurança, experiência do usuário |
| Validation | Joi | Expressividade, mensagens customizadas |
| Logs | Winston + Tenant Context | Debugging multi-tenant |
| Payment Provider | Interface + Factory | Troca de gateway sem alterar código |
| Billing Cycle | Monthly + Yearly | Flexibilidade com desconto anual |
| Subscription Block | Middleware | Bloqueio automático por inadimplência |

---

**Desenvolvido com 💙 para escalar**
