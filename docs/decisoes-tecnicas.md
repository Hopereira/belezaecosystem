# Decisões Técnicas — BelezaEcosystem

> Registro das decisões arquiteturais adotadas, com justificativa e contexto.  
> Atualizar a cada decisão relevante — data + responsável.

---

## 1. Frontend: Vanilla JS + Vite (sem framework)

**Decisão:** Usar JavaScript puro (ES6 Modules) com Vite 5 como build tool — sem React, Vue ou Svelte.

**Justificativa:**
- Projeto iniciado como prova de conceito com escopo limitado
- Evita overhead de bundle size e curva de aprendizado para time pequeno
- Vite garante HMR rápido e build eficiente sem framework
- A SPA é gerenciada pelo `core/router.js` próprio com lazy loading de módulos

**Trade-offs:**
- Sem Virtual DOM — re-renders manuais via `innerHTML` em alguns módulos
- Sem state management declarativo — estado local por módulo
- Escalabilidade limitada para UIs muito complexas

**Status:** Mantido. Migração para React/Vue seria possível módulo a módulo via Vite se necessário.

---

## 2. Backend: Arquitetura Modular com Módulos por Domínio

**Decisão:** Organizar o backend em `src/modules/<domínio>/` com `service + controller + routes + index` por módulo.

**Justificativa:**
- Separação clara de responsabilidades por domínio de negócio
- Facilita onboarding — um dev encontra tudo de "marketing" em `modules/marketing/`
- Permite testes unitários isolados sem dependência de banco
- Módulos são injetados com dependências via factory (`initModule(sequelize, models)`)

**Padrão de módulo:**
```
modules/marketing/
  marketing.service.js     — lógica de negócio
  marketing.controller.js  — HTTP in/out, delega para service
  marketing.routes.js      — Express Router, validação Joi
  index.js                 — factory initMarketingModule()
```

---

## 3. Multi-tenancy: Tenant via JWT + Header X-Tenant-Slug

**Decisão:** Cada request carrega `tenantId` no JWT e `X-Tenant-Slug` no header. O `tenantResolver` middleware resolve o tenant e injeta `req.tenantId` e `req.tenant`.

**Justificativa:**
- Stateless — sem session storage
- JWT carrega o `tenantId` diretamente para evitar lookup extra por request
- `X-Tenant-Slug` usado para resolução pública (mini-site) e para validar contexto

**Tenant resolution order:**
1. Header `X-Tenant-Slug` (verificado no DB)
2. Subdomain da requisição
3. `tenantId` do JWT (fallback para owner routes)

---

## 4. RBAC: Lista Exata de Roles (Sem Hierarquia Automática)

**Decisão:** `authorize('owner', 'admin')` permite **exatamente** os roles listados. MASTER não herda automaticamente permissões de rotas de tenant.

**Justificativa:**
- MASTER opera em contexto diferente (`/master/*` routes, sem tenantId)
- Hierarquia implícita causou bug onde MASTER acessava rotas de tenant incorretamente
- Explícito é melhor que implícito — cada rota lista exatamente quem pode acessar

**Roles do sistema:**
- `client` — cliente final (mini-site público)
- `professional` — profissional do salão (área própria)
- `admin` — administrador do tenant
- `owner` — dono do salão (acesso completo ao tenant)
- `master` — superadmin do SaaS (sem tenantId)

---

## 5. Resposta Padronizada: `{ success, data, message, meta }`

**Decisão:** Todo endpoint retorna exatamente:
```json
{
  "success": true,
  "data": { ... },
  "message": "Descrição amigável",
  "meta": { "total": 0, "page": 1, "limit": 20, "pages": 0, "has_more": false }
}
```
Erros retornam:
```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": { "code": "ERROR_CODE", "details": null }
}
```

**Justificativa:**
- Frontend pode checar `response.success` de forma uniforme
- `error.code` permite tratamento programático no cliente
- `meta` para paginação sempre no mesmo lugar

---

## 6. Testes: Mocks sem Banco Real

**Decisão:** Todos os testes (unit + integration) usam mocks de Sequelize — sem conexão real com PostgreSQL.

**Justificativa:**
- CI pode rodar sem banco configurado
- Testes são determinísticos e rápidos
- Comportamentos de DB real (índices, constraints) são validados nas migrations

**Estrutura:**
- Unit tests — mocka apenas o model/service necessário
- Integration tests — `testApp.js` builder com middlewares mockados, sem DB

**Limitação:** Testes de query SQL complexa (N+1, índices) precisam de banco real — marcados como `todo`.

---

## 7. Middleware Legado: Aliases para `shared/`

**Decisão:** `backend/src/middleware/*.js` e `backend/src/utils/*.js` são aliases que re-exportam de `backend/src/shared/middleware/` e `backend/src/shared/utils/`.

**Justificativa:**
- 21+ arquivos de owner routes importam os caminhos legados
- Migração gradual sem quebrar imports existentes
- Um refactor futuro pode atualizar os imports de uma vez e remover os aliases

**Arquivos alias (a migrar quando conveniente):**
- `src/middleware/auth.js` → `src/shared/middleware/auth.js`
- `src/middleware/errorHandler.js` → `src/shared/middleware/errorHandler.js`
- `src/middleware/validation.js` → `src/shared/middleware/validation.js`
- `src/utils/logger.js` → `src/shared/utils/logger.js`
- `src/utils/jwt.js` → `src/shared/utils/jwt.js`

---

## 8. Rate Limiting: Por Rota, Não Global

**Decisão:** Rate limiters separados por grupo de rota (auth, ajuda/contato, marketing writes, AI, mini-site público).

**Justificativa:**
- Limites diferentes por contexto de uso
- Evita penalizar rotas de leitura por writes abusivos
- Chave por IP + tenantId onde aplicável

**Configurações:**
| Grupo | Limite | Janela |
|-------|--------|--------|
| Auth (login/register) | 20 req | 15 min |
| Help contact | 5 req | 60 min |
| Marketing writes | 30 req | 15 min |
| AI assistant | 60 req | 15 min |
| Mini-site público | 60 req | 1 min |

---

## 9. N+1 Queries: Batch por Padrão

**Decisão:** Qualquer query que depende de um resultado de outra deve usar batch/include — nunca loop com await.

**Exemplo resolvido:** `CommissionsService._getBatchSettingRates()` — antes buscava 1 CommissionSetting por profissional (N queries), agora faz 1 `findAll` com `where: { id: professionalIds }`.

**Regra:** Se você está fazendo `await` dentro de `.map()` ou `for...of` em cima de resultados de banco, é um N+1.

---

## 10. `src/features/beatriz/` — Arquivado

**Decisão:** Módulo `beatriz/` (mini-site de cliente externo) movido para `archive/beatriz/`.

**Justificativa:**
- Não faz parte do produto BelezaEcosystem
- Sem rota registrada no router principal
- Paleta e identidade visual diferentes do produto
- Deve ser mantido em repositório próprio se em uso
