# Auditoria Funcional Frontend ↔ Backend
**BelezaEcosystem SaaS** | Data: 2026-04-21 | Versão: 1.0

---

## 1. Resumo Executivo

O frontend possui **47 rotas registradas** no router, cobrindo auth, owner/admin, profissional, master e público. A grande maioria dos módulos do core de negócio (agendamentos, clientes, serviços, financeiro, estoque, compras, profissionais) está **funcionalmente completa e integrada com o backend real**. Os principais problemas encontrados são: fallback excessivo em módulos de marketing e IA que escondem a ausência de backend real, links de navegação na professional-area que usam `#/` (hash) em vez do SPA router, e ausência de feedback real no fluxo de pagamento de nova assinatura (cartão de crédito não faz tokenização real).

**Resumo de status por área:**

| Área | Status | Observação |
|---|---|---|
| Auth (login, register) | ✅ OK | Funcional, redirect por role correto |
| Dashboard (owner) | ✅ OK | Todos os endpoints integrados |
| Agendamentos | ✅ OK | CRUD completo com mappers |
| Clientes | ✅ OK | CRUD + paginação server-side |
| Serviços | ✅ OK | CRUD + profissionais vinculados |
| Financeiro | ✅ OK | Entradas, saídas, DRE, filtros |
| Profissionais | ✅ OK | CRUD + form inline + métricas |
| Estoque | ✅ OK | CRUD + ajuste de estoque |
| Compras | ✅ OK | Itens dinâmicos + atualiza estoque |
| Fornecedores | ✅ OK | CRUD completo |
| Billing | ⚠️ Parcial | Cartão não tokeniza; PIX OK |
| Configurações | ✅ OK | Multi-endpoint integrado |
| Usuários | ✅ OK | CRUD + toggle ativar/desativar |
| Relatórios | ⚠️ Parcial | Tab "Crescimento" stub; DRE com dados calculados localmente |
| Marketing | ⚠️ Fallback | Campanhas e métricas usam fallback demo |
| IA Assistente | ⚠️ Fallback | Sugestões e timeline com fallback |
| Mini-site | ✅ OK | Publicação/despublicação integradas |
| Team Commissions | ⚠️ Fallback | Fallback demo quando API retorna vazio |
| Help | ⚠️ Parcial | FAQ hardcoded; só contact usa API |
| Account | ⚠️ Parcial | Email/telefone modal sem backend; notificações em localStorage |
| Professional Area | ⚠️ Parcial | Availability é stub; quick links usam hash incorreto |
| Master Area | ⚠️ Parcial | Charts Chart.js não integrado; atividade recente vazia |

---

## 2. Arquitetura Frontend Consolidada

- **Router SPA:** `src/core/router.js` — 47 rotas, lazy load de módulos, guards de auth/role/subscription
- **Padrão de página:** `render()` → shell; `init()` → dados + eventos, retorna cleanup
- **HTTP:** `src/shared/utils/http.js` — `api.get/post/put/delete/patch`, emite eventos HTTP globais (`unauthorized`, `subscriptionInactive`, `networkError`)
- **State global:** `src/core/state.js` — `getCurrentUser()`, `isAuthenticated()`, `isSubscriptionBlocked()`, `getSubscriptionStatus()`
- **Mappers:** `src/shared/utils/api-mappers.js` — normalização snake_case → camelCase para appointments, clients, services, professionals, financial
- **Subscription guard:** `isSubscriptionBlocked()` verificado antes de criar/deletar em: appointments, clients, services, financial, users, professionals
- **Auth guard:** router redireciona `/login` se não autenticado; 401 HTTP força logout global
- **Role guard:** `/professional/*` exige role `professional`; `/master/*` exige role `master`

---

## 3. Rotas Auditadas

| Rota | Módulo/Página | Arquivo | Pública | Role | Assinatura | Status |
|---|---|---|---|---|---|---|
| `/` | Landing | `public/landing/landing.js` | sim | — | — | Ativa |
| `/privacy-policy` | Política de Privacidade | `public/privacy-policy.js` | sim | — | — | Ativa |
| `/terms-of-service` | Termos de Serviço | `public/terms-of-service.js` | sim | — | — | Ativa |
| `/data-deletion` | Exclusão de Dados | `public/data-deletion.js` | sim | — | — | Ativa |
| `/login` | Login | `auth/pages/login.js` | sim | — | — | Ativa |
| `/register` | Cadastro | `auth/pages/register.js` | sim | — | — | Ativa |
| `/dashboard` | Dashboard | `dashboard/pages/dashboard.js` | não | owner/admin | não bloqueia render | Ativa |
| `/appointments` | Agendamentos | `appointments/pages/appointments.js` | não | owner/admin | bloqueia criação/deleção | Ativa |
| `/clients` | Clientes | `clients/pages/clients.js` | não | owner/admin | bloqueia criação/deleção | Ativa |
| `/services` | Serviços | `services/pages/services.js` | não | owner/admin | bloqueia criação | Ativa |
| `/professionals` | Profissionais | `professionals/pages/professionals.js` | não | owner/admin | bloqueia criação/deleção | Ativa |
| `/financial` | Financeiro | `financial/pages/financial.js` | não | owner/admin | bloqueia criação | Ativa |
| `/billing` | Assinatura | `billing/pages/billing.js` | não | owner/admin | — | Ativa |
| `/settings` | Configurações | `settings/pages/settings.js` | não | owner/admin | — | Ativa |
| `/account` | Minha Conta | `account/pages/account.js` | não | qualquer auth | — | Ativa |
| `/inventory` | Estoque | `inventory/pages/inventory.js` | não | owner/admin | — | Ativa |
| `/suppliers` | Fornecedores | `suppliers/pages/suppliers.js` | não | owner/admin | — | Ativa |
| `/purchases` | Compras | `purchases/pages/purchases.js` | não | owner/admin | — | Ativa |
| `/reports` | Relatórios | `reports/pages/reports.js` | não | owner/admin | — | Ativa |
| `/users` | Usuários | `users/pages/users.js` | não | owner/admin | bloqueia criação/deleção | Ativa |
| `/professional-details` | Detalhes Prof. | `professionals/pages/professional-details.js` | não | owner/admin | — | Ativa (não auditada internamente) |
| `/payment-transactions` | Transações | `financial/pages/payment-transactions.js` | não | owner/admin | — | Ativa (não auditada internamente) |
| `/payment-methods` | Formas de Pagamento | `financial/pages/payment-methods.js` | não | owner/admin | — | Ativa (não auditada internamente) |
| `/marketing` | Marketing | `marketing/pages/marketing.js` | não | owner/admin | — | Ativa (fallback) |
| `/ai-assistant` | IA Assistente | `ai-assistant/pages/ai-assistant.js` | não | owner/admin | — | Ativa (fallback) |
| `/help` | Ajuda | `help/pages/help.js` | não | qualquer auth | — | Ativa (parcial) |
| `/mini-site` | Mini-site | `mini-site/pages/mini-site.js` | não | owner/admin | — | Ativa |
| `/team-commissions` | Equipe & Comissões | `professionals/pages/team-commissions.js` | não | owner/admin | — | Ativa (fallback) |
| `/professional/dashboard` | Dashboard Prof. | `professional-area/pages/dashboard.js` | não | professional | — | Ativa |
| `/professional/appointments` | Agendamentos Prof. | `professional-area/pages/appointments.js` | não | professional | — | Ativa |
| `/professional/clients` | Clientes Prof. | `professional-area/pages/clients.js` | não | professional | — | Ativa |
| `/professional/earnings` | Ganhos Prof. | `professional-area/pages/earnings.js` | não | professional | — | Ativa |
| `/professional/performance` | Performance Prof. | `professional-area/pages/performance.js` | não | professional | — | Ativa |
| `/professional/profile` | Perfil Prof. | `professional-area/pages/profile.js` | não | professional | — | Ativa |
| `/professional/availability` | Disponibilidade | `professional-area/pages/availability.js` | não | professional | — | **Stub/Não implementado** |
| `/master` | Master Dashboard | `master/dashboard/master-dashboard.js` | não | master | — | Ativa (parcial) |
| `/master/tenants` | Tenants | `master/tenants/master-tenants.js` | não | master | — | Ativa |
| `/master/plans` | Planos | `master/plans/master-plans.js` | não | master | — | Ativa |
| `/master/billing` | Billing Master | `master/billing/master-billing.js` | não | master | — | Ativa |
| `/master/system` | Sistema | `master/system/master-system.js` | não | master | — | Ativa |

**Observações sobre o router:**
- Rota não encontrada → redireciona para `/dashboard` (sem 404 dedicada)
- `professional` acessando `/dashboard`, `/appointments` ou `/clients` é redirecionado para a área profissional
- Tenant com slug detectado na `/` → redireciona para `/login` automaticamente

---

## 4. Páginas Auditadas

### 4.1 Login (`/login`)
- **Propósito:** Autenticação de usuário
- **Dados carregados no init:** Nenhum (formulário estático)
- **Endpoints:** `POST /auth/login` (via `handleLogin` em `core/auth.js`)
- **Componentes:** Form 2-col (form + brand panel), toggle de senha, checkbox "lembrar"
- **Botões:** Entrar (submit), toggle senha, "Criar conta grátis" (→ /register), "Esqueceu a senha?" (sem ação backend)
- **Estados:** loading (spinner no botão), error (toast), success (redirect por role)
- **Status:** ✅ OK

### 4.2 Register (`/register`)
- **Propósito:** Cadastro de novo tenant (stepper 4 etapas)
- **Dados carregados:** Planos = STATIC_PLANS (hardcoded, não usa API de planos)
- **Endpoints:** `POST /auth/register` (via `handleRegister` em `core/auth.js`)
- **Fluxo:** Etapa 1 (dados empresa + senha) → Etapa 2 (seleção plano, estático) → Etapa 3 (pagamento cartão/PIX) → Etapa 4 (confirmação)
- **Botões:** Próximo (com validação), Voltar, Confirmar Pagamento, Ir para o Painel (→ /login)
- **Problema:** Após confirmação bem-sucedida, navega para `/login` em vez de `/dashboard`
- **Problema:** Planos hardcoded no frontend; não usa `GET /plans` para buscar planos reais do banco
- **Problema:** Dados de cartão (número, CVV) não são tokenizados via Pagar.me SDK antes de enviar; payload vai bruto para `handleRegister`
- **Status:** ⚠️ Parcial

### 4.3 Dashboard (`/dashboard`)
- **Propósito:** Visão geral do negócio
- **Endpoints:** `GET /appointments`, `GET /clients`, `GET /professionals`, `GET /appointments/stats`, `GET /financial/summary`
- **Componentes:** KPI grid (4 cards), agenda do dia, resumo financeiro, ranking profissionais, calendário mensal navegável, alertas (trial/bloqueado/pendentes), FAB mobile
- **Botões:** Ver todos (agendamentos), navegação calendário (prev/next), ações do topbar
- **Estados:** skeleton loading, empty state por seção, fallback para cálculo local de stats quando `/appointments/stats` não retorna
- **Status:** ✅ OK

### 4.4 Agendamentos (`/appointments`)
- **Propósito:** CRUD completo de agendamentos
- **Endpoints init:** `GET /appointments?limit=100`, `GET /clients?limit=200`, `GET /services?limit=100`, `GET /professionals`
- **Endpoints ações:** `POST /appointments`, `PUT /appointments/:id`, `DELETE /appointments/:id`
- **Mappers:** `mapAppointmentFromAPI`, `mapAppointmentToAPI`, `mapClientFromAPI`, `mapServiceFromAPI`, `mapProfessionalFromAPI`, `extractPaginatedResponse`
- **Filtros:** Por data (client-side), por status (client-side); `btnClearFilter` limpa ambos
- **Formulário:** Cliente (select), Serviço (select c/ preço), Profissional (select), Valor (texto formatado), Data + Hora Início + Hora Término, Status, Forma de Pagamento, Observações
- **Subscription guard:** bloqueia criação e deleção com toast
- **Status:** ✅ OK

### 4.5 Clientes (`/clients`)
- **Propósito:** CRUD de clientes com busca server-side e paginação
- **Endpoints init:** `GET /clients?page=1&limit=10`
- **Endpoints ações:** `POST /clients`, `PUT /clients/:id`, `DELETE /clients/:id`
- **Busca:** Debounce 300ms → query param `search` → server-side
- **Paginação:** Server-side, botões prev/next + numeração
- **Campos formulário:** Nome (obrigatório), Telefone (obrigatório), Email, Endereço
- **Mapper:** `mapClientFromAPI`, `mapClientToAPI`
- **Status:** ✅ OK

### 4.6 Serviços (`/services`)
- **Propósito:** CRUD de serviços com categorias e vínculo com profissionais
- **Endpoints init:** `GET /services`, `GET /professionals`
- **Endpoints ações:** `POST /services`, `PUT /services/:id`, `DELETE /services/:id`
- **Filtros:** Busca (client-side, debounce 300ms), categoria, status ativo/inativo
- **Campos formulário:** Nome, Descrição, Categoria, Duração (min), Preço, Comissão (%), Profissionais (checkboxes), Ativo (toggle)
- **Categorias:** hair, nails, makeup, skin, massage, other
- **Status:** ✅ OK

### 4.7 Financeiro (`/financial`)
- **Propósito:** Visão financeira com DRE, entradas, saídas
- **Endpoints init:** `GET /financial/entries`, `GET /financial/exits`, `GET /financial/summary`
- **Endpoints ações saídas:** `POST /financial/exits`, `PUT /financial/exits/:id`, `DELETE /financial/exits/:id`
- **Endpoints ações entradas:** `PUT /financial/entries/:id` (editar), `DELETE /financial/entries/:id`
- **Componentes:** KPI grid (4 cards), previsão de receita (canvas sem Chart.js real), fluxo de caixa, DRE (tabs mensal/trimestral/anual), tabela entradas, tabela saídas, modal nova saída
- **DRE:** Calculado localmente (50% variável heurístico); "período anterior" é fator aplicado localmente, não dado real
- **Botões sem ação real:** "Conciliação" (→ toast "em breve"), "Ver Faturas" (→ toast "em breve"), "Exportar" (→ toast; CSV de entradas funciona)
- **Problema:** `revenueChange`, `expenseChange`, `profitChange`, `marginChange` no KPI vêm de `summary?.revenue_change ?? 12.5` — fallback hardcoded se backend não retornar
- **Status:** ⚠️ Parcial

### 4.8 Profissionais (`/professionals`)
- **Propósito:** CRUD de profissionais com painel lateral inline
- **Endpoints init:** `GET /professionals`, `GET /services`
- **Endpoints ações:** `POST /professionals`, `PUT /professionals/:id`, `DELETE /professionals/:id`
- **Filtros:** Busca (client-side, debounce), especialidade, status
- **Formulário:** Nome, Especialidade, Comissão (%), Ativo
- **Métricas sidebar:** Total, ativos, comissão média, top specialty, distribuição por especialidade (barras inline)
- **Status:** ✅ OK

### 4.9 Team Commissions (`/team-commissions`)
- **Propósito:** Ranking e comissões da equipe por período
- **Endpoints:** `GET /professionals/commissions?period=week|month|year` (com catch → fallback demo)
- **Fallback:** Dados demo hardcoded quando API retorna erro ou vazio
- **Componentes:** KPI equipe, ranking medalhas, cards comissão por profissional, tabela com busca
- **Status:** ⚠️ Fallback

### 4.10 Billing (`/billing`)
- **Propósito:** Gestão de assinatura e pagamento
- **Endpoints init:** `GET /billing/subscription`, `GET /plans`, `GET /billing/invoices`
- **Endpoints ações:** `POST /billing/subscription/activate` (cartão), `POST /billing/subscription/pix`, `POST /billing/subscription/cancel`
- **Problema crítico:** Dados brutos de cartão (número, CVV, validade) são enviados diretamente para `POST /billing/subscription/activate` sem tokenização via Pagar.me SDK — **risco de segurança / PCI DSS**
- **Toggle mensal/anual:** Funcional (20% desconto no anual)
- **PIX:** Exibe QR Code se `qrCodeBase64` retornar; cópia do código PIX funcional
- **Cancelamento:** `POST /billing/subscription/cancel` com `{ immediately: false, reason: "..." }`
- **Status:** ⚠️ Parcial (P0 — ver problemas)

### 4.11 Configurações (`/settings`)
- **Propósito:** Configurações do negócio, regional, visual, horários, Pagar.me
- **Endpoints init:** `GET /tenant`, `GET /tenant/settings`, `GET /tenant/branding`, `GET /establishments/payment-settings`
- **Endpoints ações:** `PUT /tenant`, `PUT /tenant/settings`, `PUT /tenant/branding`, `PUT /establishments/payment-settings`
- **Componentes:** Info negócio, regional (timezone/idioma/moeda), identidade visual (color picker + hex sync), horário de funcionamento (7 dias), Pagar.me (API key + banco + titular), notificações
- **Status:** ✅ OK

### 4.12 Usuários (`/users`)
- **Propósito:** CRUD de usuários com roles e toggle ativo/inativo
- **Endpoints init:** `GET /users?page=1&limit=10`
- **Endpoints ações:** `POST /users`, `PUT /users/:id`, `DELETE /users/:id`, `POST /users/:id/activate`, `POST /users/:id/deactivate`
- **Filtros:** Busca (server-side, debounce), role
- **Roles disponíveis:** owner, admin, professional, client, master
- **Status:** ✅ OK

### 4.13 Relatórios (`/reports`)
- **Propósito:** Relatórios operacionais, financeiros e de crescimento
- **Endpoints (Operacional):** `GET /payment-transactions/reports/revenue-by-professional?startDate&endDate`, `GET /payment-transactions/reports/top-services?startDate&endDate`
- **Endpoints (Financeiro):** `GET /payment-transactions/reports/revenue-stats?startDate&endDate`, `GET /payment-transactions/reports/revenue-by-professional?startDate&endDate`
- **Tab Crescimento:** Stub ("em breve"), sem dados
- **DRE Local:** Calculado com dados de transações locais; "período anterior" usa fator heurístico
- **Fallbacks:** FALLBACK_OCCUPATION, FALLBACK_NOSHOW, FALLBACK_SERVICES quando API retorna vazio
- **Insight IA:** Hardcoded com nome do profissional de maior pct
- **Agendar Envio:** UI funcional mas `btnSaveSchedule` apenas fecha dropdown + toast; sem chamada API
- **Gráfico "Novos Clientes":** SVG estático hardcoded (não usa dados reais)
- **Status:** ⚠️ Parcial

### 4.14 Estoque (`/inventory`)
- **Propósito:** CRUD de produtos e ajuste de estoque
- **Endpoints init:** `GET /products`, `GET /suppliers`
- **Endpoints ações:** `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `POST /products/:id/adjust-stock`
- **Filtros:** Busca (client-side), categoria, low_stock toggle
- **Export CSV:** Funcional
- **Status:** ✅ OK

### 4.15 Compras (`/purchases`)
- **Propósito:** Registro de compras com atualização automática de estoque
- **Endpoints init:** `GET /purchases?supplier_id&payment_status`, `GET /suppliers`, `GET /products`
- **Endpoints ações:** `POST /purchases`, `DELETE /purchases/:id`
- **Itens dinâmicos:** Adição/remoção de itens antes de salvar; total calculado no frontend
- **Sem edição:** Não há `PUT /purchases/:id` — compras existentes não podem ser editadas (apenas visualizar e deletar)
- **Status:** ✅ OK (com limitação de não ter edição)

### 4.16 Fornecedores (`/suppliers`)
- **Propósito:** CRUD de fornecedores
- **Endpoints init:** `GET /suppliers`
- **Endpoints ações:** `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`
- **Export CSV:** Funcional
- **Status:** ✅ OK

### 4.17 Marketing (`/marketing`)
- **Propósito:** Automações de marketing, canais, campanhas
- **Endpoints:** `GET /marketing/campaigns`, `GET /marketing/metrics`, `GET /marketing/automations`, `PATCH /marketing/automations/:id/toggle`, `PATCH /marketing/settings`
- **Fallback:** Campanhas e métricas usam dados demo quando API falha; automações usam AUTOMATIONS estático
- **Botões sem ação real:** "Nova campanha", "Configurar" (cada cenário), "Editor Visual de Mensagens", "Segmentação de Clientes", "Calendário de Disparos", "Ver Relatório Completo" — todos → toast "em breve"
- **Ações reais:** Toggle de automação (PATCH), salvar canais (PATCH /marketing/settings)
- **Status:** ⚠️ Fallback + Parcial

### 4.18 IA Assistente (`/ai-assistant`)
- **Propósito:** Secretária IA 24h
- **Endpoints:** `GET /ai/interactions`, `GET /ai/status`, `GET /ai/suggestions`, `PUT /ai/config`
- **Fallback:** Sugestões e timeline de interações usam dados demo quando API falha
- **Cards "Disponível em breve":** Reagendamento IA, Resposta a Reviews, Promoções IA — não têm backend
- **Config:** `PUT /ai/config` com horário, canal, tom — integrado
- **Status:** ⚠️ Fallback

### 4.19 Mini-site (`/mini-site`)
- **Propósito:** Gerenciar mini-site público do salão
- **Endpoints init:** `GET /mini-site`
- **Endpoints ações:** `PATCH /mini-site` (salvar config), `POST /mini-site/publish`, `POST /mini-site/unpublish`
- **Toggles:** Agendamento online, pagamento online, avaliações, publicado — todos integrados
- **Preview:** Browser-frame estático (não renderiza o site real)
- **Status:** ✅ OK

### 4.20 Ajuda (`/help`)
- **Propósito:** FAQ, categorias de artigos, canais de suporte
- **Endpoints:** `GET /help/categories`, `GET /help/faq`, `POST /help/contact`
- **FAQ:** Accordion com busca debounced — usa dados da API; fallback hardcoded quando vazio
- **Canais:** WhatsApp abre `wa.me` link, E-mail abre `mailto:`, Docs → toast "em breve"
- **Status sistema:** Hardcoded ("Todos os sistemas operacionais")
- **Status:** ⚠️ Parcial

### 4.21 Account (`/account`)
- **Propósito:** Perfil pessoal do usuário logado
- **Endpoints:** `PUT /profile` (nome/avatar), `PUT /profile/password`
- **Problemas:** Modal "Alterar Email" → showToast "em breve"; Modal "Alterar Telefone" → showToast "em breve"
- **Notificações:** Armazenadas em `localStorage` (sem sync com backend)
- **Pagamentos tab:** Conteúdo placeholder
- **Status:** ⚠️ Parcial

### 4.22 Professional Dashboard (`/professional/dashboard`)
- **Propósito:** Dashboard pessoal do profissional
- **Endpoints:** `GET /professional/dashboard`
- **Componentes:** 3 KPIs (hoje, mês, comissão mês), próximo atendimento, links rápidos
- **Bug:** Links rápidos usam `href="#/professional/..."` (hash) em vez de `href="/professional/..."` — **o SPA router não intercepta links com `#`**
- **Status:** ⚠️ Bug (links rápidos quebrados)

### 4.23 Professional Earnings (`/professional/earnings`)
- **Propósito:** Histórico de comissões do profissional
- **Endpoints:** `GET /professional/earnings?page&limit&startDate&endDate`
- **Componentes:** 3 KPIs summary, tabela histórico, paginação, filtro por período
- **Status:** ✅ OK

### 4.24 Professional Profile (`/professional/profile`)
- **Propósito:** Perfil editável do profissional
- **Endpoints init:** `GET /professional/profile`
- **Endpoints ações:** `PUT /professional/profile` (apenas phone e avatar URL)
- **Limitação:** Nome e email são somente leitura (disabled); especialidade e comissão só via admin
- **Status:** ✅ OK (com limitações intencionais)

### 4.25 Professional Availability (`/professional/availability`)
- **Propósito:** Configurar disponibilidade de horários
- **Endpoints:** `GET /professional/availability` (endpoint chamado mas conteúdo ignorado)
- **Implementação:** Tela stub "Funcionalidade em Desenvolvimento"
- **Status:** ❌ Não implementado

### 4.26 Master Dashboard (`/master`)
- **Propósito:** Visão geral do SaaS (admin global)
- **Endpoints:** `GET /master/tenants/statistics`, `GET /master/billing/mrr`, `GET /master/billing/revenue-summary`
- **Componentes:** 6 KPIs (tenants, ativos, trial, suspensos, MRR, receita mensal), gráfico receita (placeholder Chart.js), distribuição por plano (placeholder), atividade recente (vazia)
- **Status:** ⚠️ Parcial (gráficos não implementados)

---

## 5. Matriz Página → Ação → Endpoint

### Auth

| Página | Ação | Endpoint | Método | Payload | Status |
|---|---|---|---|---|---|
| Login | Entrar | `/auth/login` | POST | `{ email, password }` | ✅ |
| Login | Esqueceu senha | — | — | — | ❌ sem ação |
| Register | Confirmar Pagamento | `/auth/register` | POST | `{ name, email, password, role, salonName, cnpj, plan, billingInterval }` | ⚠️ sem tokenização cartão |
| Register | Ir para Painel | — | navegação → `/login` | — | ⚠️ deveria ir para `/dashboard` |

### Agendamentos

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Listar | `/appointments?limit=100` | GET | — |
| Criar | `/appointments` | POST | `mapAppointmentToAPI({...})` |
| Editar | `/appointments/:id` | PUT | `mapAppointmentToAPI({...})` |
| Excluir | `/appointments/:id` | DELETE | — |
| Filtrar por data | Client-side no array | — | — |
| Filtrar por status | Client-side no array | — | — |

### Clientes

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Listar | `/clients?page&limit&search` | GET | — |
| Criar | `/clients` | POST | `mapClientToAPI({name, phone, email?, address?})` |
| Editar | `/clients/:id` | PUT | `mapClientToAPI({...})` |
| Excluir | `/clients/:id` | DELETE | — |
| Buscar | `/clients?search=termo` | GET | debounce 300ms |
| Paginar | `/clients?page=N&limit=10` | GET | server-side |

### Serviços

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Listar | `/services` | GET | — |
| Criar | `/services` | POST | `mapServiceToAPI({...}) + { professional_ids[] }` |
| Editar | `/services/:id` | PUT | idem |
| Excluir | `/services/:id` | DELETE | — |
| Filtrar | Client-side (search/cat/status) | — | — |

### Financeiro

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Entradas | `/financial/entries` | GET | — |
| Saídas | `/financial/exits` | GET | — |
| Resumo | `/financial/summary` | GET | — |
| Nova saída | `/financial/exits` | POST | `mapFinancialExitToAPI({description, amount, date, status, category})` |
| Editar saída | `/financial/exits/:id` | PUT | idem |
| Editar entrada | `/financial/entries/:id` | PUT | — |
| Excluir saída | `/financial/exits/:id` | DELETE | — |
| Excluir entrada | `/financial/entries/:id` | DELETE | — |
| Export CSV entradas | Local (client-side) | — | — |
| Conciliação | — | — | toast "em breve" |
| Ver Faturas | — | — | toast "em breve" |
| Export geral | — | — | toast placeholder |

### Profissionais

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Listar | `/professionals` | GET | — |
| Criar | `/professionals` | POST | `{ name, specialty, commission_rate, is_active }` |
| Editar | `/professionals/:id` | PUT | idem |
| Excluir | `/professionals/:id` | DELETE | — |
| Ver comissões equipe | `/professionals/commissions?period=X` | GET | — |

### Billing

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Ver assinatura | `/billing/subscription` | GET | — |
| Ver planos | `/plans` | GET | — |
| Ver faturas | `/billing/invoices` | GET | — |
| Ativar (cartão) | `/billing/subscription/activate` | POST | `{ planId, billingCycle, paymentMethod: "card", paymentData: { number, expiry, cvv, name } }` |
| Ativar (PIX) | `/billing/subscription/pix` | POST | `{ planId, billingCycle }` |
| Cancelar | `/billing/subscription/cancel` | POST | `{ immediately: false, reason }` |

### Estoque

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Listar produtos | `/products` | GET | — |
| Criar produto | `/products` | POST | `{ name, category, quantity, min_stock, unit_cost, supplier_id }` |
| Editar produto | `/products/:id` | PUT | idem |
| Excluir produto | `/products/:id` | DELETE | — |
| Ajustar estoque | `/products/:id/adjust-stock` | POST | `{ adjustment, notes }` |
| Export CSV | Local | — | — |

### Marketing

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Toggle automação | `/marketing/automations/:id/toggle` | PATCH | `{ enabled: bool }` |
| Salvar canais | `/marketing/settings` | PATCH | `{ channels: { whatsapp, sms, email } }` |
| Nova campanha | — | — | toast "em breve" |
| Configurar cenário | — | — | toast "em breve" |

### Mini-site

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Carregar | `/mini-site` | GET | — |
| Salvar config | `/mini-site` | PATCH | `{ name, description, phone, address, ...toggles }` |
| Publicar | `/mini-site/publish` | POST | — |
| Despublicar | `/mini-site/unpublish` | POST | — |

### Professional Area

| Ação | Endpoint | Método | Payload |
|---|---|---|---|
| Dashboard | `/professional/dashboard` | GET | — |
| Ganhos | `/professional/earnings?page&limit&startDate&endDate` | GET | — |
| Perfil (carregar) | `/professional/profile` | GET | — |
| Perfil (salvar) | `/professional/profile` | PUT | `{ phone, avatar }` |
| Disponibilidade | `/professional/availability` | GET | (não usado, tela stub) |

### Master Area

| Ação | Endpoint | Método |
|---|---|---|
| Stats tenants | `/master/tenants/statistics` | GET |
| MRR | `/master/billing/mrr` | GET |
| Receita resumo | `/master/billing/revenue-summary` | GET |

---

## 6. Botões/Links Sem Ação Real

| Página | Elemento | Comportamento atual | Esperado |
|---|---|---|---|
| Login | "Esqueceu a senha?" | Link estático, sem efeito | Modal de recuperação de senha |
| Register | Etapa 4 "Ir para o Painel" | Navega para `/login` | Deveria navegar para `/dashboard` |
| Financial | "Conciliação" | Toast "em breve" | Tela de conciliação bancária |
| Financial | "Ver Faturas" | Toast "em breve" | Navegar para `/payment-transactions` |
| Financial | "Exportar" (geral) | Toast placeholder | Download CSV/PDF do período |
| Reports | "Agendar Envio" → "Salvar Agendamento" | Toast sem API call | `POST /reports/schedule` |
| Reports | Gráfico "Novos Clientes/Mês" | SVG estático hardcoded | Dados reais de clientes por mês |
| Reports | Tab "Crescimento" | Stub "em breve" | Métricas LTV, churn, retenção |
| Marketing | "Nova campanha" | Toast "em breve" | Modal de criação de campanha |
| Marketing | "Configurar" (cada cenário) | Toast "em breve" | Modal de config da automação |
| Marketing | "Editor Visual de Mensagens" | Toast "em breve" | Editor visual |
| Marketing | "Segmentação de Clientes" | Toast "em breve" | Tela de segmentos |
| Marketing | "Calendário de Disparos" | Toast "em breve" | Calendário |
| Marketing | "Ver Relatório Completo" | Toast "em breve" | Tela de relatório de marketing |
| Help | "Documentação" (canal suporte) | Toast "em breve" | Link para docs externas |
| Help | Status do sistema | Hardcoded "operacional" | `GET /health` ou similar |
| Account | "Alterar Email" | Toast "em breve" | Modal com `PUT /profile/email` |
| Account | "Alterar Telefone" | Toast "em breve" | Modal com `PUT /profile/phone` |
| Account | Tab "Pagamentos" | Conteúdo placeholder | Cartões/métodos salvos |
| Account | Notificações | localStorage apenas | Sync com `PUT /profile/notifications` |
| Master Dashboard | Gráfico "Receita 12 Meses" | Placeholder texto | Chart.js com dados reais |
| Master Dashboard | Gráfico "Distribuição por Plano" | Placeholder texto | Chart.js com dados reais |
| Master Dashboard | "Atividade Recente" | Lista vazia hardcoded | `GET /master/tenants/recent-activity` |
| Prof. Dashboard | Links rápidos | `href="#/professional/..."` | `href="/professional/..."` (bug) |
| Prof. Availability | Tela inteira | Stub "em desenvolvimento" | Configuração real de horários |

---

## 7. Ações Sem Backend

| Ação | Módulo | Observação |
|---|---|---|
| Recuperação de senha | Login | Sem endpoint de forgot password |
| Tokenização de cartão (Pagar.me) | Register, Billing | Dados brutos enviados sem tokenização SDK |
| Agendar envio de relatório | Reports | Sem endpoint `/reports/schedule` |
| Criar campanha de marketing | Marketing | Sem endpoint de criação |
| Configurar cenário de automação | Marketing | Sem endpoint de config individual |
| Alterar email do usuário | Account | Sem endpoint dedicado |
| Alterar telefone do usuário | Account | Sem endpoint dedicado |
| Sincronizar preferências de notificação | Account | Apenas localStorage |
| Gestão de disponibilidade do profissional | Prof. Availability | Endpoint existe mas retorna nota; tela é stub |
| Status real do sistema | Help | Sem endpoint de healthcheck exposto ao tenant |

---

## 8. Endpoints Sem Consumo no Frontend

Com base na auditoria, os seguintes endpoints do backend existem mas **não foram encontrados em uso** no frontend:

| Endpoint | Observação |
|---|---|
| `GET /appointments/stats` | Usado no Dashboard; pode retornar dados incompletos → fallback local |
| `GET /clients/segments` | Comentário no marketing.js: "TODO: endpoint /clients/segments para popular contagens reais" |
| `POST /auth/forgot-password` | Botão existe na UI mas sem handler |
| `PUT /profile/email` | Botão "Alterar Email" apenas toast |
| `PUT /profile/phone` | Botão "Alterar Telefone" apenas toast |
| `GET /master/tenants/recent-activity` | Seção "Atividade Recente" hardcoded vazia |
| `GET /professional/availability` (PUT) | Endpoint GET é chamado mas resultado ignorado; sem PUT para salvar |

---

## 9. Inconsistências de Payload/Response

| Módulo | Inconsistência | Detalhe |
|---|---|---|
| Register | Payload não tokenizado | `paymentData: { number, expiry, cvv, name }` vai bruto para o backend — PCI DSS issue |
| Financial | DRE usa heurística | "Custos Variáveis = 50% das despesas" hardcoded; "Período Anterior" usa fator fixo |
| Financial | KPI delta hardcoded | `revenue_change ?? 12.5` — se backend não retorna delta, mostra +12.5% sempre |
| Marketing | Normalização de campos | `metrics.campaigns_active ?? metrics.active_campaigns` — backend mudou nomenclatura, frontend compensa |
| Billing | Register usa STATIC_PLANS | Planos no register não buscam `GET /plans`; preços/features podem divergir do banco |
| Professional Dashboard | Quick links hash | `href="#/professional/..."` não é interceptado pelo router SPA |
| Reports | Insight IA hardcoded | Texto do insight usa apenas nome do profissional de maior pct; não chama API de IA |
| Help | FAQ hardcoded no fallback | Se `/help/faq` falhar, exibe perguntas demo sem indicar ao usuário |

---

## 10. Fallbacks Existentes

| Módulo | Bloco | Condição | Dados usados | Impacto | Tipo |
|---|---|---|---|---|---|
| Team Commissions | Rankings, cards, tabela | `GET /professionals/commissions` retorna erro | FALLBACK_COMMISSIONS (3 profissionais demo) | Mostra dados falsos como reais | ⚠️ Mascara bug |
| Marketing | Campanhas | `GET /marketing/campaigns` retorna erro ou vazio | FALLBACK_CAMPAIGNS (4 campanhas demo) | Dados falsos para o owner | ⚠️ Mascara bug |
| Marketing | Métricas | `GET /marketing/metrics` retorna erro | FALLBACK_METRICS | Números falsos no KPI | ⚠️ Mascara bug |
| Marketing | Automações | `GET /marketing/automations` retorna erro ou vazio | AUTOMATIONS hardcoded (4 cenários) | Sem efeito visual; toggles podem falhar | ✅ Aceitável |
| IA Assistente | Sugestões | `GET /ai/suggestions` retorna erro | Sugestões demo hardcoded | Dados falsos | ⚠️ Mascara bug |
| IA Assistente | Timeline interações | `GET /ai/interactions` retorna erro | Interações demo hardcoded | Dados falsos | ⚠️ Mascara bug |
| Reports (Operacional) | Ocupação por profissional | `GET /...revenue-by-professional` retorna erro | FALLBACK_OCCUPATION | Barras com dados demo | ⚠️ Mascara bug |
| Reports (Operacional) | Taxa de no-show | Sempre fallback | FALLBACK_NOSHOW hardcoded | Sem endpoint real para no-show | ⚠️ Sem backend |
| Reports (Operacional) | Tempo médio entre visitas | Sempre fallback | `{ days: 42, change: -5 }` | Sem endpoint real | ⚠️ Sem backend |
| Reports (Operacional) | Top serviços | `GET /...top-services` retorna erro | FALLBACK_SERVICES | Dados demo | ⚠️ Mascara bug |
| Help | FAQ | `GET /help/faq` retorna erro/vazio | 8 perguntas demo | Aparenta funcionar | ✅ Temporário |
| Dashboard | Stats de agendamentos | `GET /appointments/stats` retorna vazio | Calculado do array de appointments | Dados corretos mas incompletos | ✅ Aceitável |
| Financial | Deltas de KPI | `summary` não retorna campos de variação | Hardcoded `?? 12.5`, `?? 8.2`, etc. | KPIs mostram crescimento falso | ⚠️ Mascara bug |

---

## 11. Fluxos Completos Auditados

### 11.1 Login
- Páginas: `/login`
- Fluxo: Form → `handleLogin` → `POST /auth/login` → token salvo → redirect por role
- Gaps: "Esqueceu a senha" sem implementação
- **Status: ✅ Completo (exceto recuperação de senha)**

### 11.2 Registro
- Páginas: `/register` (stepper 4 etapas)
- Fluxo: Dados empresa → Plano (estático) → Pagamento → `handleRegister` → `POST /auth/register` → Etapa 4
- Gaps: Planos não são buscados da API; cartão não tokenizado; redirect pós-cadastro vai para `/login` não `/dashboard`
- **Status: ⚠️ Parcial**

### 11.3 Logout
- Disparado pelo header/sidebar (shell.js — não auditado internamente)
- Event HTTP `unauthorized` → `logout()` → redirect `/login`
- **Status: ✅ (por evento HTTP global)**

### 11.4 Dashboard owner
- Carrega em paralelo: appointments, clients, professionals, stats, financial/summary
- Renderiza KPIs, agenda, ranking, calendário, alertas
- **Status: ✅ Completo**

### 11.5 CRUD Agendamentos
- Criar: form completo (cliente + serviço + profissional + data/hora/valor) → `POST /appointments`
- Editar: reabre modal preenchido → `PUT /appointments/:id`
- Excluir: modal de confirmação → `DELETE /appointments/:id`
- Filtros: data + status (client-side no array carregado)
- **Status: ✅ Completo**

### 11.6 CRUD Clientes
- Criar, editar, excluir com modais; busca server-side com debounce; paginação server-side
- **Status: ✅ Completo**

### 11.7 CRUD Serviços
- Criar, editar, excluir via modal dinâmico; vínculo com profissionais via checkboxes; filtros client-side
- **Status: ✅ Completo**

### 11.8 Financeiro
- Carrega entries + exits + summary; filtros por data (client-side); DRE com tabs; CRUD saídas; CSV entradas
- Gaps: Conciliação e Ver Faturas sem ação; deltas KPI hardcoded
- **Status: ⚠️ Parcial**

### 11.9 Billing / Assinatura
- Carrega subscription + plans + invoices; exibe plano atual + limites; toggle mensal/anual; modal pagamento (cartão/PIX)
- Gaps: cartão sem tokenização real; histórico de faturas pode estar vazio
- **Status: ⚠️ Parcial (P0 — cartão sem tokenização)**

### 11.10 Profissionais
- CRUD completo com form inline lateral; métricas sidebar calculadas localmente do array
- **Status: ✅ Completo**

### 11.11 Estoque
- CRUD produtos + ajuste de estoque; filtro low-stock; export CSV
- **Status: ✅ Completo**

### 11.12 Compras
- Itens dinâmicos + total calculado; POST salva e atualiza estoque; sem edição de compra existente
- **Status: ✅ Completo (sem edição)**

### 11.13 Marketing
- Carrega campanhas/métricas/automações com fallback; toggle automações tem API real; salvar canais tem API real
- Criação de campanhas e config de cenários são stubs
- **Status: ⚠️ Fallback + Parcial**

### 11.14 Mini-site
- Carrega config; salva via PATCH; publicar/despublicar via POST dedicado
- **Status: ✅ Completo**

### 11.15 Professional Area (fluxo completo)
- Dashboard: GET /professional/dashboard → KPIs + próximo atendimento
- Earnings: GET /professional/earnings com filtro por período e paginação
- Profile: GET + PUT /professional/profile (phone + avatar)
- Availability: GET chamado mas tela é stub
- Quick links: bug com `href="#/..."` — links não funcionam pelo SPA router
- **Status: ⚠️ Parcial (bug quick links + stub availability)**

### 11.16 Master Area
- Dashboard: stats tenants + MRR + receita; gráficos são placeholders
- Tenants, Plans, Billing, System: não auditados internamente
- **Status: ⚠️ Parcial**

---

## 12. Problemas Encontrados

### P0 — Críticos

| ID | Problema | Localização | Impacto |
|---|---|---|---|
| P0-1 | Dados brutos de cartão de crédito enviados sem tokenização via Pagar.me SDK | `billing/pages/billing.js` linha 393-398; `auth/pages/register.js` linha 576-588 | Risco de segurança/PCI DSS — número, CVV, nome e validade trafegam em plaintext até o backend |
| P0-2 | Quick links do Professional Dashboard usam `href="#/professional/..."` | `professional-area/pages/dashboard.js` linhas 159-169 | Navegação quebrada — o SPA router intercepta `<a href="/path">` mas não `href="#/path"` |

### P1 — Importantes

| ID | Problema | Localização | Impacto |
|---|---|---|---|
| P1-1 | Planos no Register são hardcoded (STATIC_PLANS) | `auth/pages/register.js` linhas 17-37 | Preços/features no registro podem divergir do que está no banco de dados |
| P1-2 | Após registro bem-sucedido, redireciona para `/login` | `auth/pages/register.js` linha 512 | UX ruim — usuário deveria ir direto para `/dashboard` |
| P1-3 | Fallbacks de Marketing mascaram ausência de backend real | `marketing/pages/marketing.js` | Owner vê dados demo como se fossem reais sem indicação visual |
| P1-4 | Fallbacks de IA mascaram ausência de dados reais | `ai-assistant/pages/ai-assistant.js` | Idem |
| P1-5 | Fallbacks de Team Commissions mascaram ausência de dados | `professionals/pages/team-commissions.js` | Dados demo de performance apresentados como reais |
| P1-6 | Deltas KPI financeiro hardcoded quando backend não retorna | `financial/pages/financial.js` linhas 296-299 | KPI sempre mostra +12.5%/+8.2%/+15.3%/+4.2% quando summary não retorna campos de variação |
| P1-7 | Professional Availability é stub completo | `professional-area/pages/availability.js` | Profissional não consegue configurar sua disponibilidade |
| P1-8 | Alterar email e telefone em Account sem backend | `account/pages/account.js` | Funcionalidade anunciada na UI mas não implementada |

### P2 — Melhorias

| ID | Problema | Localização | Impacto |
|---|---|---|---|
| P2-1 | DRE financeiro usa heurística 50/50 para custos variáveis | `financial/pages/financial.js` | DRE não reflete realidade do negócio |
| P2-2 | Gráfico "Novos Clientes/Mês" é SVG estático | `reports/pages/reports.js` | Dado sempre o mesmo, sem relação com banco |
| P2-3 | Gráfico "Receita" em Financial usa `<canvas>` sem Chart.js integrado | `financial/pages/financial.js` | Canvas existe mas nada é renderizado |
| P2-4 | Insight IA em Reports é texto template fixo | `reports/pages/reports.js` | Não usa dados de IA real |
| P2-5 | "Agendar Envio" em Reports não chama API | `reports/pages/reports.js` | Botão salvar apenas fecha dropdown |
| P2-6 | Notificações de Account apenas em localStorage | `account/pages/account.js` | Preferências não persistem no backend |
| P2-7 | Master Dashboard gráficos são placeholders | `master/dashboard/master-dashboard.js` | Chart.js não integrado |
| P2-8 | "Atividade Recente" no Master Dashboard vazia | `master/dashboard/master-dashboard.js` | Sempre exibe "Dados de atividade serão exibidos aqui" |
| P2-9 | Compras não têm edição (sem `PUT /purchases/:id`) | `purchases/pages/purchases.js` | Compra registrada errada não pode ser corrigida, apenas excluída |
| P2-10 | Status do sistema em Help hardcoded | `help/pages/help.js` | Sempre mostra "Todos os sistemas operacionais" |

### P3 — Técnico/Organização

| ID | Problema | Localização | Impacto |
|---|---|---|---|
| P3-1 | `professional-area` usa `<style>` inline dentro de innerHTML | múltiplos arquivos professional-area | CSS não reutilizável; pode acumular tags `<style>` em re-renders |
| P3-2 | `billing.js` redefine `closeModal` localmente, sobrescrevendo global | `billing/pages/billing.js` linha 514-519 | Potencial conflito com `window.closeModal` de outros módulos |
| P3-3 | `services.js` usa `confirm()` nativo para deleção | `services/pages/services.js` linha 332 | Inconsistente com o padrão do restante do app que usa modal de confirmação |
| P3-4 | `purchases.js` usa `window.removeItem` global | `purchases/pages/purchases.js` linha 343 | Polui o namespace global; pode conflitar com outros módulos |
| P3-5 | Filtros de agendamentos são client-side com limit=100 | `appointments/pages/appointments.js` | Para salões com >100 agendamentos por período, filtragem ficará incompleta |

---

## 13. Priorização

### Correções Imediatas (P0)

1. **[P0-1]** Implementar tokenização de cartão via Pagar.me.js/SDK antes de enviar para o backend. O backend jamais deveria receber o PAN cru.
2. **[P0-2]** Corrigir links rápidos no Professional Dashboard: `href="#/professional/..."` → `href="/professional/..."`.

### Alta Prioridade (P1)

3. **[P1-2]** Redirecionar para `/dashboard` após registro bem-sucedido.
4. **[P1-1]** Buscar planos via `GET /plans` no register em vez de STATIC_PLANS hardcoded.
5. **[P1-6]** Garantir que o backend retorne campos de delta nos KPIs financeiros, ou remover os fallbacks hardcoded.
6. **[P1-3/4/5]** Indicar visualmente quando fallback está ativo (ex: banner "dados de demonstração") em Marketing, IA e Team Commissions.
7. **[P1-7]** Implementar tela de disponibilidade do profissional.
8. **[P1-8]** Implementar alterar email e telefone em Account.

### Média Prioridade (P2)

9. **[P2-9]** Adicionar edição de compra (`PUT /purchases/:id`).
10. **[P2-1]** Melhorar DRE: categorizar saídas por tipo (fixo/variável) no banco em vez de heurística 50/50.
11. **[P2-2]** Substituir SVG estático de "Novos Clientes/Mês" por dados reais de `GET /clients?groupBy=month`.
12. **[P2-3]** Integrar Chart.js no gráfico de receita do Financial.
13. **[P2-5]** Implementar `POST /reports/schedule` e conectar ao botão "Salvar Agendamento".
14. **[P2-6]** Sincronizar preferências de notificação com o backend.
15. **[P2-7/8]** Integrar Chart.js no Master Dashboard + endpoint de atividade recente.

---

## 14. Correções Rápidas Recomendadas

As correções abaixo são de **1 a 5 linhas** e podem ser aplicadas imediatamente:

### Fix 1 — Quick links Professional Dashboard (P0-2)
**Arquivo:** `src/features/professional-area/pages/dashboard.js`
```js
// ANTES (linhas 159-169):
<a href="#/professional/appointments" class="quick-link">
<a href="#/professional/clients" class="quick-link">
<a href="#/professional/earnings" class="quick-link">
<a href="#/professional/performance" class="quick-link">

// DEPOIS:
<a href="/professional/appointments" class="quick-link">
<a href="/professional/clients" class="quick-link">
<a href="/professional/earnings" class="quick-link">
<a href="/professional/performance" class="quick-link">
```

### Fix 2 — Redirect pós-registro (P1-2)
**Arquivo:** `src/features/auth/pages/register.js`
```js
// ANTES (linha 512):
document.getElementById('btn-go-dashboard')?.addEventListener('click', () => navigateTo('/login'));

// DEPOIS:
document.getElementById('btn-go-dashboard')?.addEventListener('click', () => navigateTo('/dashboard'));
```

### Fix 3 — Indicar fallback ativo no Marketing (P1-3)
**Arquivo:** `src/features/marketing/pages/marketing.js` — adicionar banner quando usando fallback
```js
// No final de loadData(), se campaigns === FALLBACK_CAMPAIGNS:
const usingFallback = campaigns === FALLBACK_CAMPAIGNS;
// Renderizar banner de aviso ao topo do conteúdo
```

### Fix 4 — Remover deltas hardcoded no Financial (P1-6)
**Arquivo:** `src/features/financial/pages/financial.js` — substituir fallback numérico por `null`:
```js
// ANTES (linhas 296-299):
const revenueChange  = summary?.revenue_change  ?? 12.5;
const expenseChange  = summary?.expense_change  ?? 8.2;
const profitChange   = summary?.profit_change   ?? 15.3;
const marginChange   = summary?.margin_change   ?? 4.2;

// DEPOIS: Se não há dado real, não exibir delta
const revenueChange  = summary?.revenue_change  ?? null;
// E no finKpi(), se change === null, não renderizar a linha de variação
```

### Fix 5 — Remover window.removeItem global em Purchases (P3-4)
**Arquivo:** `src/features/purchases/pages/purchases.js`
```js
// Substituir onclick="window.removeItem(${index})" por data-attribute + event delegation
```

---

## 15. Itens que Exigem Refatoração Posterior

| Item | Esforço | Prioridade | Descrição |
|---|---|---|---|
| Tokenização Pagar.me | Alto | P0 | Integrar SDK Pagar.me.js no frontend para tokenizar cartão antes de enviar ao backend |
| Filtros de agendamentos server-side | Médio | P1 | Mover filtragem de data/status para query params do `GET /appointments` |
| Professional Availability | Alto | P1 | Implementar tela completa de gestão de horários com slots semanais |
| Chart.js Financial | Médio | P2 | Integrar gráfico de receita/previsão com dados reais |
| Chart.js Master Dashboard | Médio | P2 | Integrar gráficos de receita e distribuição de planos |
| Marketing — criação de campanhas | Alto | P2 | Implementar fluxo completo de criação de campanha |
| Marketing — config de cenários | Alto | P2 | Modal de configuração por automação (template, canal, timing) |
| DRE com categorização real | Alto | P2 | Categorizar despesas como fixas/variáveis no banco para DRE real |
| Dados de crescimento (Reports) | Alto | P2 | Implementar LTV, churn, retenção no backend + tab Crescimento |
| Edição de compras | Médio | P2 | Implementar `PUT /purchases/:id` no backend e UI de edição |
| Recuperação de senha | Médio | P2 | `POST /auth/forgot-password` + tela de reset |
| Alterar email/telefone | Baixo | P2 | Endpoints dedicados + modais de confirmação |
| CSS inline em Professional Area | Médio | P3 | Mover `<style>` inline para arquivos CSS do design system |
| Substituir `confirm()` por modal | Baixo | P3 | Services.js usa `confirm()` nativo; usar modal padrão do app |

---

*Auditoria gerada em: 2026-04-21*
*Base de código: commit atual (Fase 9 consolidada)*
*Cobertura: 35+ arquivos JS auditados, 40 rotas mapeadas, 47 rotas registradas no router*
