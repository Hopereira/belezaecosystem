# Auditoria de Aderência do Produto às Personas
**Data:** 2026-04-21 | **Versão:** 1.0 | **Base:** código-fonte (sem suposições)

---

## 1. Resumo Executivo

O sistema está **majoritariamente alinhado** às 4 personas de negócio, com diferenciação
real entre Tenant `establishment` e `autonomous`. Os principais gaps são:
- **Profissional Liberal** (Persona 3): modelado como `autonomous` no backend,  
  mas o **frontend de cadastro** (`register.js`) não oferece esse fluxo — só existe rota de API.
- **Cliente Final** (Persona 4): mini-site público existe, agendamento público **ausente**.
- **OWNER vs ADMIN**: diferença documentada nas constantes, mas **algumas rotas confundem os dois**.
- **Billing do profissional liberal**: idêntico ao do salão — sem planos específicos.

---

## 2. As 4 Personas de Negócio

| # | Persona | Descrição |
|---|---------|-----------|
| 1 | **Dono do SaaS (Master)** | Admin global — gerencia todos os tenants, planos e billing |
| 2 | **Dono do Salão (Owner/Admin)** | Gestor de um tenant `establishment` com equipe |
| 3 | **Profissional Liberal** | Autônomo — atende sozinho, sem equipe (tenant `autonomous`) |
| 4 | **Cliente Final** | Consumidor — agenda via mini-site público |

---

## 3. Papéis Técnicos Atuais

Definidos em `backend/src/shared/constants/index.js`:

```
ROLES = {
  CLIENT:       'client',
  PROFESSIONAL: 'professional',
  ADMIN:        'admin',
  OWNER:        'owner',
  MASTER:       'master',
}
```

**Hierarquia:** CLIENT < PROFESSIONAL < ADMIN < OWNER < MASTER

### Descrição de cada role no sistema:

| Role | Onde criado | Tenant? | Subscription? |
|------|-------------|---------|---------------|
| `master` | Seed manual | Não (cross-tenant) | Não |
| `owner` | `onboarding.service.signup()` | Sim | Sim |
| `admin` | `POST /users` (por owner) | Sim | Herdada do tenant |
| `professional` | `POST /professionals` (por owner/admin) | Sim | Herdada do tenant |
| `client` | Existe na constante | — | — |

---

## 4. Mapeamento Persona → Role

| Persona | Role(s) mapeado(s) | Correto? |
|---------|-------------------|----------|
| Dono do SaaS | `master` | ✅ |
| Dono do Salão | `owner` | ✅ |
| Gestor delegado do salão | `admin` | ✅ |
| Profissional Liberal (solo) | `owner` + tenant `autonomous` | ⚠️ Parcial — usa `owner` mas sem diferença funcional no app |
| Profissional vinculado ao salão | `professional` | ✅ |
| Cliente Final | `client` (existe na constante) | ❌ Não usado no sistema atual |

---

## 5. Modelo de Tenant

### Campos relevantes (`tenant.model.js`):

```
type: ENUM('establishment', 'autonomous')
document_type: ENUM('cpf', 'cnpj')
```

- **`establishment`**: salão com equipe, CNPJ, múltiplos profissionais
- **`autonomous`**: profissional liberal, CPF, sem equipe

### Como é criado:

- Via `POST /api/signup` → `tenantType: 'establishment'` (padrão)
- Via `POST /api/signup/autonomous` → `tenantType: 'autonomous'`, usa nome do dono como nome do tenant

### O que diferencia os dois no código:

| Aspecto | `establishment` | `autonomous` |
|---------|----------------|--------------|
| Modelo Tenant | ✅ `type = 'establishment'` | ✅ `type = 'autonomous'` |
| Criação de usuário | `role = 'owner'` | `role = 'owner'` (mesmo!) |
| Onboarding API | `POST /api/signup` | `POST /api/signup/autonomous` |
| Plano | Mesmo catálogo | Mesmo catálogo |
| Telas do app | Dashboard de salão | Dashboard de salão (idêntico) |
| Gestão de equipe | Faz sentido | ⚠️ Exibido mas sem equipe |
| Mini-site | ✅ Disponível | ✅ Disponível |
| Relatórios | ✅ Disponível | ✅ Disponível |

---

## 6. Auditoria por Persona

---

### 6.1 Persona 1 — Dono do SaaS (Master)

**Objetivo:** Administrar todo o ecossistema SaaS.

#### Telas acessadas:
- `/master` → `master-dashboard.js`
- `/master/tenants` → `master-tenants.js`
- `/master/plans` → `master-plans.js`
- `/master/billing` → `master-billing.js`
- `/master/system` → `master-system.js`

#### Backend:
- `GET/POST/PUT /api/master/tenants/*` — authorize(`master`) ✅
- `GET/POST/PUT /api/master/billing/*` — authorize(`['master']`) ✅
- Tenant resolver **bypassa** MASTER: pode operar sem tenant context ✅

#### Permissões:
- Sem tenant obrigatório (`tenantResolver` faz bypass para MASTER) ✅
- Pode especificar tenant via header `X-Tenant-Slug` ✅
- Subscription check não se aplica ao MASTER ✅

#### Dados visíveis:
- MRR, estatísticas de tenants, histórico de faturamento, planos ✅
- Audit logs ✅
- Webhook logs ✅

#### Fluxo:
1. Login → detecta `role = master` → redireciona `/master` ✅
2. Navega entre tenants, planos, billing ✅

#### Gaps:
- `POST /api/master/tenants/:id/suspend` existe, mas não há **log de auditoria de ações do master** fora do billing
- Não há tela de impersonation/visualizar como tenant

#### Classificação: **✅ Alinhado** (com gaps menores)

---

### 6.2 Persona 2 — Dono do Salão (Owner/Admin)

**Objetivo:** Gerir o negócio de beleza completo com equipe.

#### Telas acessadas:
Todas as rotas `auth: true` sem `role` explícito no router (padrão = todas as roles autenticadas):
`/dashboard`, `/appointments`, `/clients`, `/services`, `/professionals`,
`/financial`, `/billing`, `/settings`, `/account`, `/marketing`, `/ai-assistant`,
`/mini-site`, `/reports`, `/inventory`, `/purchases`, `/users`, `/team-commissions`

#### Backend:
- Todos os módulos `owner/` usam `authorize('owner', 'admin')` ✅
- `requireActiveSubscription()` em todos ✅
- Dados sempre filtrados por `tenant_id` ✅

#### Diferença OWNER vs ADMIN:

| Ação | OWNER | ADMIN |
|------|-------|-------|
| Listar/criar appointments | ✅ | ✅ |
| Criar professionals | ✅ | ✅ |
| Gerenciar billing | ✅ | ⚠️ Acessa `/billing` (sem guard de role no frontend) |
| Configurar tenant settings | ✅ | ❌ (backend: `authorize(ROLES.OWNER)` apenas) |
| Configurar branding | ✅ | ❌ (backend: `authorize(ROLES.OWNER)` apenas) |

#### Gaps:
- **Frontend** `/billing` e `/settings` não têm guard de role — ADMIN consegue ver a tela, mas o backend rejeita as alterações sensíveis (UX confusa)
- Não existe tela de "transferir ownership"
- ADMIN pode criar/deletar profissionais → pode ser amplo demais para alguns negócios

#### Classificação: **⚠️ Parcial** (backend correto, frontend sem guards de role para billing/settings)

---

### 6.3 Persona 3 — Profissional Liberal (solo)

**Objetivo:** Usar o sistema solo, sem contratar equipe.

#### Como entra no sistema:
- `POST /api/signup/autonomous` → cria tenant `type = autonomous` + user `role = owner` ✅

#### Problemas encontrados:

**P3-A: Frontend de cadastro não expõe o fluxo autônomo**
- `register.js` sempre usa `POST /api/signup` (establishment)
- Não há campo "Sou profissional autônomo / Tenho um salão"
- O campo "Nome do salão" aparece obrigatório visualmente, mesmo para autônomo

**P3-B: App idêntico ao salão após login**
- Profissional autônomo entra com `role = owner` → vai para `/dashboard`
- Vê: gestão de equipe, compras, fornecedores → irrelevante para solo
- Não há ocultamento de módulos por `tenant.type`

**P3-C: Billing sem diferenciação**
- Planos não diferenciam `establishment` vs `autonomous`
- Um autônomo paga o mesmo que um salão com 10 profissionais

**P3-D: `professional-area` é para role `PROFESSIONAL`, não para autônomo**
- Profissional Liberal tem `role = owner` → NÃO acessa `/professional/dashboard`
- O profissional vinculado ao salão tem `role = professional` → acessa `/professional/dashboard`
- São personas diferentes, ambas chamadas "profissional" — mas com roles opostos

#### Dados relevantes vs exibidos:

| Dado | Relevância para autônomo | Exibido? |
|------|--------------------------|---------|
| Agendamentos | ✅ Alta | ✅ |
| Clientes | ✅ Alta | ✅ |
| Financeiro | ✅ Alta | ✅ |
| Mini-site | ✅ Alta | ✅ |
| Profissionais/equipe | ❌ Irrelevante | ✅ (exibido) |
| Compras/estoque | ⚠️ Opcional | ✅ (exibido) |
| Comissões | ❌ Irrelevante | ✅ (exibido) |
| Marketing | ⚠️ Parcial | ✅ (exibido) |

#### Classificação: **⚠️ Parcial** (backend modelado, frontend não diferencia)

---

### 6.4 Persona 4 — Cliente Final

**Objetivo:** Agendar serviços via mini-site do salão.

#### O que existe:
- `GET /api/public/mini-site/:slug` — dados públicos do mini-site ✅
- Frontend `mini-site.js` — painel de configuração do salão ✅
- `src/features/public/landing.js` — landing page do SaaS ✅

#### O que NÃO existe (ausente no código):
- Página pública de agendamento para o cliente (**não há rota `/booking` ou similar**)
- Seleção de serviço, profissional, data/hora pelo cliente
- Confirmação de agendamento sem autenticação
- Pagamento online pelo cliente
- Página de perfil do cliente público
- Avaliações/reviews (toggle existe no mini-site, mas endpoint ausente)

#### O que está parcial:
- Toggle `allowOnlineBooking` existe no modelo do tenant → infraestrutura prevista
- Toggle `requirePaymentOnBooking` existe → mas sem implementação
- Mini-site público tem rate limit → preparado para tráfego público

#### Classificação: **🚫 Ausente** (infraestrutura iniciada, funcionalidade pública não implementada)

---

## 7. Matriz de Permissões

| Persona | Role | Telas | Ações permitidas | Dados visíveis | Restrições | Subscription |
|---------|------|-------|-----------------|----------------|------------|--------------|
| Dono SaaS | `master` | /master/* | CRUD tenants, CRUD planos, ver billing global, suspender tenants | Todos os tenants, MRR, auditoria | Nenhuma | N/A |
| Dono Salão | `owner` | Todas exceto /master/* e /professional/* | CRUD completo, configurar tenant e branding | Dados do próprio tenant | Subscription bloqueante | trial/active/past_due |
| Gestor | `admin` | Operacionais (appointments, clients, professionals, financial) | CRUD operacional | Dados do próprio tenant | Não pode alterar tenant settings/branding | Herdada do tenant |
| Prof. Vinculado | `professional` | /professional/* | Ver própria agenda, clientes atendidos, ganhos, perfil | Apenas os próprios dados | Não pode ver dados do salão | Herdada do tenant |
| Prof. Liberal | `owner` (tenant autonomous) | Iguais ao dono de salão | Iguais ao dono de salão | Iguais ao dono de salão | ⚠️ Sem restrição por tipo de tenant | trial/active/past_due |
| Cliente Final | — | /public/mini-site/:slug | ⚠️ Nenhuma — agendamento público inexistente | Dados públicos do mini-site | — | N/A |

---

## 8. Matriz de Fluxos

### Cadastro

| Persona | Fluxo esperado | Fluxo atual | Gap |
|---------|---------------|-------------|-----|
| Dono SaaS | Seed manual / convite | Seed manual (`002_seed_master_and_tenant.js`) | ✅ OK |
| Dono Salão | Register → Plano → Pagamento → Dashboard | `register.js` stepper 4 etapas + `POST /api/signup` | ✅ OK |
| Prof. Liberal | Register autônomo → CPF → Plano → Dashboard simplificado | `POST /api/signup/autonomous` existe, mas **sem tela frontend** | ❌ Gap |
| Prof. Vinculado | Criado pelo Owner/Admin | `POST /api/professionals` cria User+Professional | ✅ OK |
| Cliente Final | Auto-cadastro ou guest | Não implementado | 🚫 Ausente |

### Login

| Persona | Fluxo esperado | Fluxo atual | Gap |
|---------|---------------|-------------|-----|
| Master | Login → /master | `login.js` detecta `role=master` → `/master` | ✅ OK |
| Owner/Admin | Login → /dashboard | `role != professional/master` → `/dashboard` | ✅ OK |
| Prof. Liberal | Login → /dashboard | Igual a owner | ⚠️ Sem diferenciação |
| Prof. Vinculado | Login → /professional/dashboard | `role=professional` → `/professional/dashboard` | ✅ OK |
| Cliente Final | N/A | N/A | 🚫 Ausente |

### Onboarding

| Persona | Fluxo esperado | Fluxo atual | Gap |
|---------|---------------|-------------|-----|
| Dono Salão | Criar salão → trial → billing | `onboarding.service.signup()` → trial automático | ✅ OK |
| Prof. Liberal | Criar perfil autônomo → trial | `signupAutonomous()` → delega para `signup()` com `type=autonomous` | ⚠️ Funciona no backend, sem UX dedicada |
| Prof. Vinculado | Recebe convite ou owner cria conta | Owner cria via `/professionals` → senha padrão `123456` | ⚠️ Senha padrão fraca sem obrigação de trocar |

### Billing

| Persona | Fluxo esperado | Fluxo atual | Gap |
|---------|---------------|-------------|-----|
| Dono Salão | Ver plano, upgrade, histórico faturas | `billing.js` completo, Pagar.me integrado | ✅ OK |
| Prof. Liberal | Idem, ou plano específico solo | Idem ao salão | ⚠️ Sem plano específico |
| Prof. Vinculado | Não gerencia billing | Sem acesso real (backend rejeita), mas UI não esconde | ⚠️ UX confusa |

### Uso Diário

| Persona | Fluxo | Status |
|---------|-------|--------|
| Dono Salão | Dashboard → Agenda → Clientes → Financeiro | ✅ Completo |
| Prof. Liberal | Dashboard → Agenda → Clientes → Financeiro | ✅ Funciona (mas com ruído de módulos irrelevantes) |
| Prof. Vinculado | Dashboard pessoal → Meus agendamentos → Meus ganhos | ✅ Completo |
| Cliente Final | Mini-site → Agendar → Pagar | ❌ Agendamento público ausente |

---

## 9. Alinhamentos Corretos ✅

1. **MASTER totalmente isolado** — rotas próprias, sem tenant obrigatório, RBAC correto
2. **Isolamento de tenant** — todos os módulos owner filtram por `tenant_id`, sem vazamento de dados
3. **Professional Area** — role `professional` tem rotas dedicadas, dados filtrados só para o próprio profissional
4. **Modelo de tenant dual** (`establishment` / `autonomous`) — bem modelado no banco e no serviço de onboarding
5. **Subscription enforcement** — `requireActiveSubscription()` em todos os módulos operacionais
6. **Hierarquia OWNER > ADMIN** — configurações sensíveis (branding, settings) exigem OWNER no backend
7. **Login com role-redirect** — master → `/master`, professional → `/professional/dashboard`, outros → `/dashboard`
8. **Signup autônomo** — `POST /api/signup/autonomous` existe e é funcional

---

## 10. Desalinhamentos ⚠️❌🚫

| ID | Severidade | Descrição |
|----|-----------|-----------|
| D1 | 🔴 P0 | Profissional Liberal não tem fluxo de cadastro no frontend — `register.js` só cria `establishment` |
| D2 | 🟠 P1 | Frontend não diferencia tenant `autonomous` de `establishment` após login — mesmo app |
| D3 | 🟠 P1 | Profissional vinculado criado com senha padrão `123456` sem force-reset |
| D4 | 🟠 P1 | ADMIN consegue navegar para `/billing` e `/settings` mas é bloqueado no backend — UX confusa |
| D5 | 🟠 P1 | `role: 'professional'` nas rotas do router não tem guard explícito — qualquer role autenticado pode tentar acessar `/professional/*` (o backend bloqueia, mas o frontend não impede cedo) |
| D6 | 🟡 P2 | Planos de assinatura sem diferenciação entre `establishment` e `autonomous` |
| D7 | 🟡 P2 | `client` existe como role nas constantes mas nunca é criado nem usado — dead code |
| D8 | 🚫 — | Persona 4 (Cliente Final) completamente ausente — sem agendamento público, sem perfil de cliente |

---

## 11. Riscos

| ID | Risco | Impacto |
|----|-------|---------|
| R1 | Profissional vinculado criado com senha `123456` hardcoded | Segurança — acesso não autorizado se email vazar |
| R2 | ADMIN pode ver tela de billing → pode tentar ações que o backend rejeita com erro 403 | UX / Suporte |
| R3 | Sem guard de role no frontend para `/professional/*` (apenas `auth: true, role: 'professional'`) — guard existe em `router.js` mas redireciona para `/dashboard`, não para página de erro clara | UX |
| R4 | Profissional Liberal (autônomo) usa exatamente o mesmo app que dono de salão — risco de confusão e suporte desnecessário | Produto |
| R5 | Toggle `allowOnlineBooking` e `requirePaymentOnBooking` existem no modelo mas sem implementação — expectativa de feature não entregue | Produto |

---

## 12. Recomendações

| ID | Recomendação | Persona afetada |
|----|-------------|-----------------|
| Rec1 | Adicionar seletor "Tenho um salão / Sou autônomo" no `register.js` (step 1) e direcionar para `POST /api/signup/autonomous` | P3 |
| Rec2 | Após login de tenant `autonomous`, ocultar módulos irrelevantes (Profissionais/Equipe, Compras, Fornecedores, Comissões) — ler `tenant.type` via `GET /api/tenant` | P3 |
| Rec3 | Forçar troca de senha no primeiro login de `professional` criado pelo owner (`force_password_reset` flag no User model) | P2/P3 |
| Rec4 | Adicionar guard visual no frontend para ADMIN em `/billing` e `/settings` (desabilitar botões de ação, mostrar banner "Apenas o proprietário pode alterar estas configurações") | P2 |
| Rec5 | Criar plano específico "Solo" com limite de 1 profissional e preço menor — diferenciar `autonomous` no catálogo | P3 |
| Rec6 | Remover ou implementar o role `client` — definir se o cliente final terá conta ou será sempre guest | P4 |
| Rec7 | Implementar página pública de agendamento `/booking/:slug` (maior gap de produto) | P4 |
| Rec8 | Registrar na documentação que `PROFESSIONAL` = vinculado ao salão, e que autônomo usa `OWNER` com `tenant.type = autonomous` | Todos |

---

## 13. Prioridades

### 🔴 P0 — Corrigir antes do próximo deploy
- **D1 / Rec1**: Cadastro frontend não suporta profissional autônomo — usuários autônomos não conseguem se cadastrar pela interface
- **R1 / Rec3**: Senha padrão `123456` para profissionais criados pelo owner

### 🟠 P1 — Próximo sprint
- **D2 / Rec2**: App idêntico para autônomo e salão — ruído de UX e produto
- **D4 / Rec4**: Guard visual para ADMIN em billing/settings
- **D5**: Guard antecipado no router para `/professional/*` (redirect com mensagem clara)

### 🟡 P2 — Backlog de produto
- **D6 / Rec5**: Plano "Solo" para autônomos
- **D7 / Rec6**: Definir destino do role `client`
- **R5 / Rec7**: Implementar agendamento público (maior iniciativa — escopo de nova fase)

---

*Fonte: código-fonte em `d:\Ficando_rico\Projetos\belezaecosystem\belezaecosystem`*  
*Metodologia: leitura direta de middleware, rotas, controllers, modelos e frontend — sem suposições.*
