# Beleza Ecosystem SaaS — Arquitetura de Produção

> Atualizado: 2026-04-21 (Fase 9 — auditoria arquitetural, limpeza, README, decisoes-tecnicas) | Backend: **LIVE ✅** | Frontend: **LIVE ✅** | CI/CD: **LIVE ✅**

---

## 1. Diagrama Geral

```
                        USUÁRIO (Browser)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
 belezaecosystem.com.br    app.belezaecosystem.com.br   cliente1.belezaecosystem.com.br
 (Landing SaaS)            (SPA)                        (Tenant Subdomain)
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                   Cloudflare Pages (CDN)
                   Serve: dist/ (Vite build)
                              │
                              ▼
                  api.belezaecosystem.com.br ──► Fly.io (GRU)
                  Node.js/Express:5001     │
                              │            │
                              ▼            │
                  Supabase PostgreSQL 15   │
                  db.sbidpqh...supabase.co │
                              │            │
                    ┌─────────┴─────────┐  │
                    ▼                   ▼  ▼
              Resend (emails)    UptimeRobot (monit.)
```

---

## 2. Mapa de Domínios

| Domínio | Função | Hosting | Status |
|---------|--------|---------|--------|
| `belezaecosystem.com.br` | Landing pública do SaaS | Cloudflare Pages | ✅ Live |
| `app.belezaecosystem.com.br` | SPA do SaaS (login, dashboard) | Cloudflare Pages | ✅ Live |
| `adm.belezaecosystem.com.br` | Painel Master (mesma SPA, rota /master) | Cloudflare Pages | ✅ Live |
| `api.belezaecosystem.com.br` | API Backend Node.js | Fly.io (belezaecosystem-backend) | ✅ Live |
| `*.belezaecosystem.com.br` | Tenants (multi-tenant) | Cloudflare Pages wildcard | ✅ Wildcard ativo |

### DNS Necessários

```
# API (Fly.io) — belezaecosystem-backend  ✅ CONFIGURADO
A     api   → 66.241.125.210
AAAA  api   → 2a09:8280:1::e4:20f0:0

# Frontend (Cloudflare Pages — projeto: beleza-ecosystem)  ✅ CONFIGURADO
CNAME app   → beleza-ecosystem.pages.dev   (proxied)
CNAME adm   → beleza-ecosystem.pages.dev   (proxied)
CNAME *     → beleza-ecosystem.pages.dev   (proxied, wildcard para tenants)
```

### Slugs Reservados (não são tenants)

```
www, api, app, adm, admin, mail, ftp, smtp, cdn, static, assets
```

---

## 3. Fluxo Multi-Tenant

```
cliente1.belezaecosystem.com.br
  │
  ├─ DNS *.belezaecosystem.com.br → Cloudflare Pages (mesma SPA)
  ├─ Frontend config.js → getTenantSlug()
  │    hostname.split('.')[0] = "cliente1" (não é reservado) → return "cliente1"
  ├─ http.js envia Header: X-Tenant-Slug: cliente1
  ├─ Backend tenantResolver.js resolve tenant no DB
  └─ Todas queries filtradas por tenant_id
```

---

## 4. Backend (Fly.io)

| Item | Valor |
|------|-------|
| App | `belezaecosystem-backend` |
| URL | `https://belezaecosystem-backend.fly.dev` ✅ |
| Custom | `https://api.belezaecosystem.com.br` ✅ |
| Região | `gru` (São Paulo) |
| Runtime | Node.js 20, Express, Sequelize 6 |
| Porta | 5001 |
| Máquinas | 256mb shared CPU, `min_machines_running=1` |
| Migrations | `release_command = node_modules/.bin/sequelize db:migrate` |

### Endpoints Principais

| Grupo | Rotas | Auth | Tenant |
|-------|-------|------|--------|
| **Público** | `/api/health`, `/api/auth/login`, `/api/billing/plans` | ❌ | ❌ |
| **Master** | `/api/master/tenants/*`, `/api/master/billing/*`, `/api/master/lgpd/*` | ✅ master | ❌ |
| **Tenant** | `/api/users/*`, `/api/tenant/*`, `/api/auth/me`, `/api/lgpd/*`, `/api/notifications/*` | ✅ | ✅ |
| **Owner** | `/api/services,clients,appointments,financial,professionals,products,suppliers,purchases,reports/*` | ✅ | ✅ + subscription |

### Secrets (Fly.io)

```
DATABASE_URL       → postgresql://postgres:***@db...supabase.co:5432/postgres?sslmode=require
NODE_ENV           → production
JWT_SECRET         → ***
JWT_REFRESH_SECRET → ***
CORS_ORIGIN        → https://app.belezaecosystem.com.br,https://adm.belezaecosystem.com.br
```

---

## 5. Frontend (Vite SPA)

| Item | Valor |
|------|-------|
| Framework | Vanilla JS ES6 Modules |
| Bundler | Vite 5 → `dist/` |
| API URL | `VITE_API_URL` ou `/api` (dev proxy) |
| Auth | JWT em localStorage |
| Tenant | Extraído do subdomain ou localStorage |

### Build de Produção

```bash
VITE_API_URL=https://api.belezaecosystem.com.br npm run build
```

### Rotas SPA

| Rota | Auth | Role |
|------|------|------|
| `/` Landing, `/login`, `/register` | ❌ | — |
| `/dashboard`, `/appointments`, `/clients`, `/services`, `/financial`, `/billing` | ✅ | any |
| `/inventory`, `/suppliers`, `/purchases`, `/reports` | ✅ | owner+ |
| `/professional/*` (7 rotas) | ✅ | professional |
| `/master`, `/master/tenants`, `/master/plans`, `/master/billing` | ✅ | master |

---

## 6. Banco de Dados (Supabase)

| Item | Valor |
|------|-------|
| Host | `db.sbidpqhncyqmlbriyroo.supabase.co:5432` |
| SSL | require |
| Migrations | 36 ✅ (036 adicionada nesta sessão — coluna `avatar`) |
| Seeds | subscription_plans + master_and_tenant ✅ |

### Tabelas Principais

```
users, tenants, subscriptions, subscription_plans
professionals, services, clients, appointments
financial_entries, financial_exits, payment_methods
products, suppliers, purchases, purchase_items
professional_details, payment_transactions, inventory_movements
invoices, usage_logs, establishments (legacy)
login_attempts          ← novo (migration 032)
lgpd_deletion_requests  ← novo (migration 035)
```

---

## 7. Credenciais de Teste (Produção)

| Role | Email | Senha | Tenant |
|------|-------|-------|--------|
| master | `master@belezaecosystem.com` | `123456` | — |
| owner | `owner@belezapura.com` | `123456` | `beleza-pura` |
| admin | `admin@belezapura.com` | `123456` | `beleza-pura` |
| professional | `prof@belezapura.com` | `123456` | `beleza-pura` |

---

## 8. Status das Correções Pós-Auditoria

| PR | Título | Status |
|----|--------|--------|
| #6 | JWT_SECRET obrigatório + bruteForce em /auth/login | ✅ Merged |
| #7 | SQL parametrizado + requireSubscription + migrations 032/033 | ✅ Merged |
| #8 | asyncHandler billing + DB_PASSWORD obrigatório + app.legacy removido | ✅ Merged |
| #10 | LGPD + Notifications + migrations 034/035 + 24 testes Jest | 🔄 PR aberto |

---

## 9. ⚠️ Problemas Residuais

### 9.1 Detecção de subdomain para domínios .com.br

O `getTenantSlug()` no frontend usa `hostname.split('.').length >= 3` para detectar subdomínio. Para domínios `.com.br` (TLD de 2 partes), isso gera falso positivo:

```
belezaecosystem.com.br → ["belezaecosystem","com","br"] → length=3 → sub="belezaecosystem" ❌ (falso tenant!)
app.belezaecosystem.com.br → ["app","belezaecosystem","com","br"] → length=4 → sub="app" → reservado ✅
cliente1.belezaecosystem.com.br → ["cliente1","belezaecosystem","com","br"] → length=4 → sub="cliente1" ✅
```

**Fix necessário**: Para `.com.br`, exigir `parts.length >= 4`. **Já implementado no frontend `config.js:34`** — verificar backend `tenantResolver.js`.

### 9.2 CORS para subdomínios de tenants

O `CORS_ORIGIN` atual só permite `app.belezaecosystem.com.br` e `adm.belezaecosystem.com.br`. Tenants em subdomínios (`cliente1.belezaecosystem.com.br`) serão bloqueados.

**Fix**: Usar regex ou wildcard no CORS:

```javascript
// app.multitenant.js
origin: (origin, callback) => {
  if (!origin || origin.endsWith('.belezaecosystem.com.br') || origin === 'https://belezaecosystem.com.br') {
    callback(null, true);
  } else {
    callback(new Error('CORS blocked'));
  }
}
```

### 9.3 Suite de Testes Jest

✅ **Resolvido na Fase 8.** 9 suites, 133 testes passando (5 `todo` para DB real). Testes de integração usam mocks de Sequelize — sem dependência de banco real.

---

## 10. Fase 8 — Produção Ready (2026-04-21)

| Item | Entregue | Commits |
|------|----------|---------|
| Unit tests (4 services) | ✅ | `49fc4a9` |
| Integration tests (auth, marketing, mini-site, help) | ✅ | `49fc4a9` |
| OpenAPI/Swagger UI (`/api/docs`) | ✅ | `49fc4a9` |
| Correlation-ID + response-time structurado | ✅ | `49fc4a9` |
| Rate limits: auth, help/contact, marketing writes, AI, mini-site público | ✅ | `49fc4a9` |
| Padronização `{success, data, message, meta}` em todos os controllers | ✅ | `ad9d41a` |
| N+1 fix: `_getBatchSettingRates` em CommissionsService | ✅ | `ad9d41a` |
| Frontend: `meta.total` (era `pagination.total`), 402 subscription guard | ✅ | `56da1a6` |
| `err.message` do backend em toasts (spam guard, publish guard) | ✅ | `56da1a6` |
| `docs/setup.md` — guia completo dev/Docker/produção | ✅ | `49fc4a9` |

---

## 11. Fase 9 — Auditoria Arquitetural (2026-04-21)

| Item | Entregue | Commit |
|------|----------|--------|
| `docs/auditoria-arquitetural-final.md` — auditoria completa do repositório | ✅ | `abd15e7` |
| `docs/decisoes-tecnicas.md` — 10 decisões arquiteturais documentadas | ✅ | `abd15e7` |
| `README.md` — reescrito do zero (preciso, profissional) | ✅ | `abd15e7` |
| 12 docs obsoletos removidos (SESSION_REPORT, SAAS_CHECKLIST, ENTERPRISE_ARCH, etc.) | ✅ | `abd15e7` |
| `COMO_USAR.md`, `down.bat`, `down.ps1` removidos da raiz | ✅ | `abd15e7` |
| `CHANGELOG.md` arquivado em `archive/` | ✅ | `abd15e7` |
| `src/features/beatriz/` arquivado — cliente externo fora do produto | ✅ | `abd15e7` |
| `src/features/landing/` removido — stub duplicado de `public/landing/` | ✅ | `abd15e7` |
| `src/shared/utils/formatting.js` + `src/shared/design/tokens.js` removidos — código morto | ✅ | `abd15e7` |
| `src/features/professional/` renomeado para `professional-area/` — conflito de nome resolvido | ✅ | `abd15e7` |
| `scripts/` removido — `seed_plans_supabase.sql` movido para `docs/` | ✅ | `abd15e7` |
| `backend/src/middleware/*.js` + `utils/*.js` viram aliases para `shared/` | ✅ | `abd15e7` |
| Fix: `authorize()` normaliza roles para lowercase + exact match (sem hierarquia) | ✅ | `abd15e7` |
| 133 testes passando após todas as mudanças | ✅ | `abd15e7` |

---

## 12. Próximos Passos

1. **CORS wildcard**: Suportar subdomínios de tenants (`*.belezaecosystem.com.br`)
2. **Fix subdomain backend**: Verificar `tenantResolver.js → extractSubdomain()` para `.com.br`
3. **Senhas padrão**: Alterar credenciais `123456` dos usuários de seed
4. **Redis**: Para tenant cache compartilhado em deploy multi-instância
5. **Emails**: Integrar Resend para transacionais (registro, reset senha)
6. **CSP**: Habilitar Helmet ContentSecurityPolicy com nonce para SPA
7. **CI testes**: Adicionar `JWT_SECRET` + `NODE_ENV=test` nos secrets do CI
8. **Migrar imports legados**: Atualizar os 21 owner routes para apontar direto a `shared/middleware/` (remover aliases)
9. **Monitoramento**: Configurar alertas UptimeRobot para `api.belezaecosystem.com.br/api/health`
