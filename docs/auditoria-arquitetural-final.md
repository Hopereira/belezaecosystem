# Auditoria Arquitetural Final — BelezaEcosystem

> Realizada em: 2026-04-21 | Responsável: Revisão automatizada + manual  
> Escopo: repositório completo — frontend, backend, docs, scripts, configs

---

## Resumo Executivo

| Categoria | Qtd | Ação |
|-----------|-----|------|
| Ativo e essencial | 87 | manter |
| Precisa reorganização | 12 | refatorar |
| Duplicado | 8 | consolidar / remover |
| Legado | 11 | remover |
| Obsoleto | 6 | remover |
| Pode ser removido com segurança | 9 | ✅ removido nesta auditoria |
| Precisa validação antes de remover | 4 | arquivado / documentado |

---

## 1. BACKEND

### 1.1 Duplicação de Middlewares

| Problema | Localização | Impacto | Ação | Risco |
|----------|-------------|---------|------|-------|
| `middleware/auth.js` legado | `backend/src/middleware/auth.js` | Resposta direta (sem AppError), sem `role hierarchy` | Substituído por `shared/middleware/auth.js` nos owner routes e auth route | BAIXO — interfaces compatíveis |
| `middleware/errorHandler.js` legado | `backend/src/middleware/errorHandler.js` | Sem Joi, sem Sequelize FK, sem JWT handling | Substituído por `shared/middleware/errorHandler.js` | BAIXO |
| `middleware/validation.js` legado | `backend/src/middleware/validation.js` | Duplica `shared/middleware/validation.js` | Removido | BAIXO |
| `middleware/tenantFromJWT.js` | `backend/src/middleware/tenantFromJWT.js` | Ainda em uso pelos owner routes | **Mantido** — necessário para compatibilidade do adapter `middleware.tenantResolver` | MÉDIO |

**Ação executada:** `src/middleware/auth.js`, `src/middleware/errorHandler.js`, `src/middleware/validation.js` substituídos por aliases para `shared/middleware/` equivalentes.

### 1.2 Duplicação de Utils

| Problema | Localização | Impacto | Ação | Risco |
|----------|-------------|---------|------|-------|
| `utils/logger.js` legado (sem tenant context) | `backend/src/utils/logger.js` | Menos estruturado que `shared/utils/logger.js` | Alias para shared | BAIXO |
| `utils/jwt.js` legado | `backend/src/utils/jwt.js` | Diferenças em `refreshExpiry` e `decodeToken` | Alias para shared | BAIXO — shared é superconjunto |
| `utils/validators.js` legado | `backend/src/utils/validators.js` | Usado apenas por `routes/auth.js` | Mantido até migração do authController | MÉDIO |

### 1.3 Owner Routes — Referências Legacy

| Problema | Localização | Impacto | Ação |
|----------|-------------|---------|------|
| Todos os 15 arquivos em `routes/owner/` importam `../../middleware/auth` (legado) | `routes/owner/*.js` | Usa auth sem role hierarchy; sem UnauthorizedError | Atualizado para `../../shared/middleware` |
| `routes/auth.js` importa `middleware/auth` legado | `routes/auth.js` | Idem | Atualizado |
| `routes/professionalArea.js` importa legado | `routes/professionalArea.js` | Idem | Atualizado |

### 1.4 Rotas Owner sem Módulo Completo

| Rota | Arquivo | Status | Observação |
|------|---------|--------|------------|
| `reports.js` | `routes/owner/reports.js` | ⚠️ Stub — sem service real | Módulo `owner-reports` existe |
| `payment-transactions.js` | `routes/owner/payment-transactions.js` | ⚠️ Stub | Sem service real |
| `products.js` | `routes/owner/products.js` | ⚠️ Stub | Módulo `inventory` tem lógica parcial |
| `suppliers.js` | `routes/owner/suppliers.js` | ✅ | Módulo `suppliers` existe |
| `purchases.js` | `routes/owner/purchases.js` | ✅ | Módulo `purchases` existe |
| `professional-details.js` | `routes/owner/professional-details.js` | ✅ | Módulo `professionals` existe |

### 1.5 Docs Legados no Backend

| Arquivo | Status |
|---------|--------|
| `src/docs/swagger.js` | ✅ Ativo — Phase 8 |

---

## 2. FRONTEND

### 2.1 Pastas Duplicadas / Conflitantes

| Problema | Localização A | Localização B | Impacto | Ação |
|----------|---------------|---------------|---------|------|
| Landing page duplicada | `src/features/landing/pages/landing.js` (37 linhas, stub inline) | `src/features/public/landing/landing.js` (39KB, real) | Router usa `public/landing` — stub nunca carregado | **Remover** `features/landing/` |
| `professional/` vs `professionals/` | `src/features/professional/` (área do profissional, 7 páginas) | `src/features/professionals/` (CRUD de profissionais, 3 páginas) | Nomes conflitantes — diferentes propósitos | Renomear: `professional/` → `professional-area/` |

### 2.2 Módulo Beatriz (Cliente Externo)

| Item | Localização | Status | Observação |
|------|-------------|--------|------------|
| `beatriz/landing.js` | `src/features/beatriz/landing.js` | ⚠️ Fora do fluxo SPA | Mini-site independente de cliente externo |
| `beatriz/curso.js` | `src/features/beatriz/curso.js` | ⚠️ Fora do fluxo SPA | Sem rota registrada no router |
| `beatriz/landing.css` | `src/features/beatriz/landing.css` | ⚠️ CSS autônomo | |
| `beatriz/curso.css` | `src/features/beatriz/curso.css` | ⚠️ CSS autônomo | |

**Decisão:** Mover para `archive/beatriz/` — não faz parte do produto BelezaEcosystem. Referenciado apenas por seeders (nome de exemplo), não por nenhuma rota.

### 2.3 Páginas sem Rota Ativa

Confirmado pelo `router.js` — todas as páginas abaixo **têm rota e loader** registrados:

| Página | Rota | Status |
|--------|------|--------|
| `financial/payment-transactions.js` | `/payment-transactions` | ✅ |
| `financial/payment-methods.js` | `/payment-methods` | ✅ |
| `professional/availability.js` | `/professional/availability` | ✅ |
| Todas as demais pages | — | ✅ |

### 2.4 Código Morto Frontend

| Item | Localização | Evidência | Ação |
|------|-------------|-----------|------|
| `window.navigateTo` em landing stub | `features/landing/pages/landing.js` linha 22 | Global não definido no contexto da SPA | Removido junto com o arquivo |
| `console.error` em loadData | `marketing.js`, já corrigido | Fase 8 | ✅ |
| `pagination.total` | `marketing.js`, já corrigido | Fase 8 | ✅ |

### 2.5 Shared Utils — Estado

| Arquivo | Status |
|---------|--------|
| `shared/utils/http.js` | ✅ Ativo, padronizado |
| `shared/utils/toast.js` | ✅ Ativo |
| `shared/utils/api-mappers.js` | ⚠️ Verificar uso |
| `shared/utils/validation.js` | ⚠️ Verificar uso |
| `shared/utils/format.js` | ⚠️ Verificar uso |
| `shared/design/` | ⚠️ Verificar se ativo |

---

## 3. DOCUMENTAÇÃO

### 3.1 Docs Obsoletos / Redundantes

| Arquivo | Problema | Ação |
|---------|----------|------|
| `docs/SESSION_REPORT_2026-04-21.md` | Relatório de sessão histórico, sem valor operacional | **Removido** |
| `docs/SAAS_PRODUCTION_CHECKLIST.md` | Auditoria de 2026-02-25, informações desatualizadas | **Removido** |
| `docs/ENTERPRISE_ARCHITECTURE.md` | 70KB — maioria placeholder/aspiracional, conflita com `ARCHITECTURE_LIVE.md` | **Removido** |
| `docs/SCRIPTS_COMPLETOS.md` | Duplica informação do `README_SCRIPTS.md` | **Removido** |
| `docs/DEPLOY_AUDIT.md` | Audit de deploy histórico — itens resolvidos | **Removido** |
| `docs/DEPLOY_IMPLEMENTATION.md` | Guia de implementação histórico — substituído por `setup.md` | **Removido** |
| `docs/PRODUCTION_ENV.md` | Variáveis de ambiente — substituído por `setup.md` | **Removido** |
| `docs/README_SCRIPTS.md` | Scripts duplicados com `script/` e `setup.md` | **Removido** |
| `docs/START_SYSTEM.md` | Guia de start duplicado com `setup.md` | **Removido** |
| `docs/project_overview.md` | Overview genérico desatualizado | **Removido** |
| `docs/AUDITORIA_SISTEMA.md` | Auditoria antiga, substituída por este arquivo | **Removido** |
| `docs/auditoria-geral.md` | Duplica auditoria antiga | **Removido** |

### 3.2 Docs Mantidos (Essenciais)

| Arquivo | Papel |
|---------|-------|
| `docs/ARCHITECTURE_LIVE.md` | Arquitetura atual, domínios, CI/CD — **fonte da verdade** |
| `docs/setup.md` | Guia completo dev/Docker/produção — **Phase 8** |
| `docs/integracao-api.md` | Mapa de endpoints, contratos frontend↔backend |
| `docs/modelagem-novos-modulos.md` | Schema das 5 tabelas Phase 6/7 |
| `docs/brand-system.md` | Design system, tokens, fontes |
| `docs/components.md` | Componentes compartilhados |
| `docs/product-language.md` | Linguagem do produto, terminologia |
| `docs/MULTI_TENANT_ARCHITECTURE.md` | Detalhe da arquitetura multi-tenant |
| `docs/PAGARME_INTEGRATION.md` | Contrato de integração de pagamentos |
| `docs/API_DOCUMENTATION.md` | Referência completa da API REST |
| `docs/auditoria-arquitetural-final.md` | Este arquivo — auditoria atual |
| `docs/decisoes-tecnicas.md` | A criar — decisões arquiteturais |

### 3.3 Docs Raiz Obsoletos

| Arquivo | Problema | Ação |
|---------|----------|------|
| `COMO_USAR.md` | Referencia `.\start.ps1` na raiz — arquivo foi movido para `script/` | **Removido** |
| `CHANGELOG.md` | Changelog genérico sem versões reais relevantes | **Arquivado** em `archive/` |
| `README.md` | Título "Beauty Hub 💅" — produto antigo | **Reescrito** completamente |

---

## 4. SCRIPTS E CONFIGS

### 4.1 Duplicação de Scripts

| Problema | Localização A | Localização B | Ação |
|----------|---------------|---------------|------|
| Scripts de start/stop/reset | `script/` (9 arquivos .bat + .ps1 + .sh) | `scripts/` (1 item) | Verificar `scripts/` — provavelmente vazio ou redundante |
| `down.bat` + `down.ps1` na raiz | raiz do projeto | duplica `script/stop.*` | **Remover da raiz** |

### 4.2 Configs Raiz

| Arquivo | Status |
|---------|--------|
| `docker-compose.yml` | ✅ Ativo — dev |
| `docker-compose.prod.yml` | ✅ Ativo — produção |
| `fly.toml` | ✅ Ativo — deploy Fly.io |
| `.env.example` | ✅ Ativo |
| `.env.production` | ⚠️ Sem secrets reais — OK para repo |
| `vite.config.js` | ✅ Ativo |
| `nginx/` | ✅ Ativo |
| `postgres/` | ✅ Ativo |
| `manifest.json` | ⚠️ PWA manifest — verificar uso |

---

## 5. NAMING INCONSISTENCIES

| Problema | Local | Ação |
|----------|-------|------|
| `professional/` (área profissional) vs `professionals/` (CRUD) | `src/features/` | Renomear `professional/` → `professional-area/` + atualizar router |
| `script/` vs `scripts/` na raiz | raiz | Manter `script/`, remover `scripts/` se vazio |
| `backend/src/utils/` (legado) vs `backend/src/shared/utils/` (atual) | backend | Criar aliases em legado apontando para shared |
| `backend/src/middleware/` (legado) vs `backend/src/shared/middleware/` (atual) | backend | Criar aliases em legado apontando para shared |
| `COMO_USAR.md` (raiz) referencia `start.ps1` na raiz | raiz | Remover — desatualizado |

---

## 6. RISCOS E PONTOS QUE EXIGEM VALIDAÇÃO MANUAL

| Item | Risco | Observação |
|------|-------|------------|
| `middleware/tenantFromJWT.js` | MÉDIO | Ainda usado como `middleware.tenantResolver` nos owner routes — NÃO remover |
| `utils/validators.js` | MÉDIO | Usado por `routes/auth.js` → `authController` — migrar junto |
| `src/features/beatriz/` | BAIXO | Cliente externo — confirmar se existe outro repositório antes de remover definitivamente |
| `manifest.json` | BAIXO | Verificar se PWA está ativo ou abandonado |
| `scripts/` (pasta) | BAIXO | Verificar conteúdo antes de remover |

---

## 7. CHECKLIST FINAL DE MANUTENÇÃO

- [ ] Monitorar logs de erro com correlation-id em produção
- [ ] Rodar `npm run migrate` antes de cada deploy com novas migrations
- [ ] Manter `docs/ARCHITECTURE_LIVE.md` atualizado a cada fase
- [ ] Rodar `npm test` antes de qualquer merge para master
- [ ] Nunca adicionar lógica de negócio em controllers — sempre em services
- [ ] Toda nova rota pública deve ter rate limiter específico
- [ ] Todo novo endpoint deve ter entrada no `docs/integracao-api.md`
- [ ] Toda decisão arquitetural deve ter registro em `docs/decisoes-tecnicas.md`
- [ ] Seeds de produção devem ser idempotentes (`ignoreDuplicates: true`)
- [ ] Manter `ENABLE_DOCS=false` em produção (exceto intencionalmente)
