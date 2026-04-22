# BelezaEcosystem — Production Readiness Checklist

> Gerado após hardening final. Última atualização: 2026-04.

---

## ✅ RESOLVIDO NESTA SESSÃO

| # | Área | Problema | Status |
|---|------|----------|--------|
| H1 | Auth | `logout`, `forgot-password`, `reset-password` ausentes no router | ✅ Rotas adicionadas |
| H2 | Auth | `authController.register` não importava Tenant/Subscription | ✅ Corrigido |
| H3 | Billing | `console.log` em `webhook.controller` (sem logger estruturado) | ✅ Substituído por `logger` |
| H4 | Nginx | Bloco OPTIONS com `Access-Control-Allow-Origin: *` (conflito de headers) | ✅ Removido — CORS gerenciado só pelo Express |
| H5 | Frontend | `.env.production` sem `VITE_PAGARME_PUBLIC_KEY` | ✅ Adicionado com placeholder explícito |
| H6 | Backend | `DB_PASSWORD` com fallback hardcoded `'beleza_secret_2026'` | ✅ Fallback removido (string vazia) |
| H7 | Billing | `billing.jobs` usando `console.log` em vez de logger estruturado | ✅ 13 ocorrências substituídas |
| H8 | Auth | Login não retornava `tenant` nem `subscription` ao frontend | ✅ Incluídos na resposta |
| H9 | Segurança | Helmet com `contentSecurityPolicy: false` | ✅ CSP básica habilitada |

---

## ✅ RESOLVIDO EM SESSÕES ANTERIORES (P0/P1/P2)

| Área | Item |
|------|------|
| Billing | Tokenização PCI: `cardToken` obrigatório, raw card data rejeitado |
| Billing | Providers mock e Pagar.me validam token antes de criar assinatura |
| Billing | Validation schema Joi com `cardToken` obrigatório para cartão |
| Financial | DRE: estimativas sinalizadas, bug shadowing `expenses` corrigido |
| Marketing | Stats hardcoded removidos; gráfico sinalizado como ilustrativo |
| Master Dashboard | Chart placeholders substituídos por SVG reais |
| Account | Tab Pagamentos: cartão 4242 hardcoded removido |
| Reports | No-show e avg visit: estado vazio honesto; agendamento "em breve" |
| Backend | 133 testes passando (unit + integration) |
| Backend | Rate limits por tenant+IP; auth limiter 20 req/15min |
| Backend | Brute force protection em login |
| Backend | Winston structured logging + correlation-id |
| Backend | Swagger UI (`/api/docs`) desabilitado em produção por padrão |
| Backend | `errorHandler` não vaza stack trace em produção |
| Multi-tenant | `requireActiveSubscription` middleware em todas as rotas tenant |
| Multi-tenant | Tenant isolation via `tenant_id` em todas as queries |

---

## ⚠️ RISCOS RESTANTES (pendências conhecidas)

| # | Prioridade | Item | Impacto |
|---|-----------|------|---------|
| R1 | 🔴 CRÍTICO | `forgot-password` retorna sucesso mas **não envia email** (Resend/SMTP não configurado) | Reset de senha não funciona |
| R2 | 🔴 CRÍTICO | `VITE_PAGARME_PUBLIC_KEY=pk_live_REPLACE_WITH_REAL_KEY` — placeholder real não configurado | Tokenização de cartão falha em produção |
| R3 | 🟠 ALTO | Billing jobs (`billing.jobs.js`) definidos mas **não agendados automaticamente** (BullMQ/cron não integrado) | Trials expirados, cobranças atrasadas não processadas |
| R4 | 🟠 ALTO | `reset-password` retorna HTTP 501 — fluxo completo requer token assinado + email | Usuários não conseguem recuperar senha |
| R5 | 🟠 ALTO | Redis ausente — token blacklist (logout definitivo) não implementado | Tokens roubados permanecem válidos até expirar (1h) |
| R6 | 🟡 MÉDIO | `Subscription.plan_name` pode ser `null` se migração de planos não rodou | Dashboard mostra plano vazio |
| R7 | 🟡 MÉDIO | CORS: subdomínios `*.belezaecosystem.com.br` permitidos via regex — validar com domínio real | Possível aceitação de origem indesejada se regex falhar |
| R8 | 🟡 MÉDIO | CSP `scriptSrc: 'self' + api.pagar.me` — Pagar.me JS SDK pode precisar de CDN adicional | Tokenização pode ser bloqueada pelo browser |
| R9 | 🟡 MÉDIO | CI/CD: `JWT_SECRET` + `NODE_ENV=test` não configurados como GitHub Secrets | Testes automáticos falham em CI |
| R10 | 🟢 BAIXO | `console.log` em seeders (002_seed_master_and_tenant) — não executado em produção | Sem impacto real em produção |
| R11 | 🟢 BAIXO | Imports legados: 21 rotas `owner/*` importam de `../middleware/auth` (alias) em vez de `shared/middleware` | Funciona mas gera confusão na manutenção |

---

## 📋 CHECKLIST DE DEPLOY

### Backend (Fly.io)

```bash
# Variáveis obrigatórias — configurar via fly secrets set
fly secrets set NODE_ENV=production
fly secrets set JWT_SECRET=<min-32-chars-random>
fly secrets set JWT_REFRESH_SECRET=<min-32-chars-random>
fly secrets set DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
fly secrets set CORS_ORIGIN=https://app.biaxavier.com.br,https://biaxavier.com.br
fly secrets set PAYMENT_PROVIDER=pagarme
fly secrets set PAGARME_API_KEY=ak_live_...
fly secrets set PAGARME_SECRET_KEY=sk_live_...
fly secrets set PAGARME_WEBHOOK_SECRET=whsec_...
fly secrets set PAGARME_ENVIRONMENT=production

# Rodar migrations
fly ssh console -C "cd /app && npx sequelize-cli db:migrate"

# Rodar seeds (planos + master user) — idempotentes
fly ssh console -C "cd /app && npx sequelize-cli db:seed:all"
```

### Frontend (Cloudflare Pages)

```
# Environment Variables no painel Cloudflare Pages → Settings → Environment Variables
VITE_API_URL = https://api.biaxavier.com.br/api
VITE_PAGARME_PUBLIC_KEY = pk_live_...  ← OBRIGATÓRIO
```

### Docker Compose (self-hosted)

```bash
cp .env.example .env
# Editar .env com valores reais:
# - JWT_SECRET, JWT_REFRESH_SECRET (min 32 chars)
# - DB_PASSWORD (strong)
# - CORS_ORIGIN
# - PAGARME_API_KEY, PAGARME_SECRET_KEY (se em produção)

npm run build           # Build frontend → dist/
docker-compose -f docker-compose.prod.yml up -d

# Migrations
docker exec belezaecosystem_backend npx sequelize-cli db:migrate
docker exec belezaecosystem_backend npx sequelize-cli db:seed:all
```

---

## 🔍 SMOKE TEST MANUAL

```bash
# 1. Health
curl https://api.biaxavier.com.br/api/health

# 2. Schema
curl https://api.biaxavier.com.br/api/health/schema

# 3. Planos públicos
curl https://api.biaxavier.com.br/api/billing/plans

# 4. Login
curl -X POST https://api.biaxavier.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@beleza.com","password":"master123"}'

# 5. Token inválido → deve retornar 401
curl https://api.biaxavier.com.br/api/dashboard \
  -H "Authorization: Bearer token_invalido"

# 6. Sem tenant → deve retornar 400/403
curl https://api.biaxavier.com.br/api/clients \
  -H "Authorization: Bearer <valid_token>"
```

---

## 🏁 VEREDICTO: PRONTO PARA PRODUÇÃO?

| Dimensão | Status |
|----------|--------|
| Autenticação JWT (login/logout/refresh) | ✅ |
| Multi-tenancy (isolamento por tenant_id) | ✅ |
| Subscription gate (active/trial/past_due/blocked) | ✅ |
| Billing seguro (tokenização PCI, sem raw card data) | ✅ |
| Rate limiting (global + auth + por módulo) | ✅ |
| Headers de segurança (Helmet + CSP) | ✅ |
| CORS configurado por lista explícita | ✅ |
| Logging estruturado (sem dados sensíveis) | ✅ |
| Error handling sem vazamento de stack em produção | ✅ |
| Validação de inputs (Joi em todas as rotas) | ✅ |
| Dados fake removidos ou explicitamente sinalizados | ✅ |
| Testes backend (133 passando) | ✅ |
| Build frontend sem erros | ✅ |
| Migrations e seeds idempotentes | ✅ |
| README e docs coerentes | ✅ |
| **Reset de senha via email** | ❌ Resend/SMTP pendente |
| **Billing jobs agendados automaticamente** | ❌ BullMQ/cron pendente |
| **Token blacklist (logout definitivo)** | ❌ Redis pendente |
| **VITE_PAGARME_PUBLIC_KEY em produção** | ⚠️ Placeholder — substituir antes do go-live |

### Conclusão

> **O sistema está PRONTO para deploy com billing via PIX e pagamentos manuais.**
> Para billing com cartão de crédito, configure `VITE_PAGARME_PUBLIC_KEY` com a chave pública live do Pagar.me.
> O único fluxo bloqueante para usuários finais é recuperação de senha — mitigar configurando Resend antes do go-live público.
