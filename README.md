# Beauty Hub 💅

Sistema de gestão completo para profissionais de beleza — **Full-Stack** com SPA frontend, API REST backend e infraestrutura Docker.

## 🚀 Tecnologias

### Frontend
- **Vite 5** — Build tool e dev server
- **Vanilla JavaScript** (ES6 Modules) — Zero frameworks
- **HTML5 & CSS3** — Design system moderno
- **Font Awesome 6** — Ícones

### Backend
- **Node.js 20 LTS** + **Express.js** — API REST
- **Sequelize 6** — ORM
- **PostgreSQL 15** — Banco de dados
- **JWT** + **bcrypt** — Autenticação
- **Joi** — Validação de dados
- **Winston** — Logging estruturado

### Infraestrutura
- **Docker Compose** — Orquestração
- **Nginx** — Reverse proxy + static files
- **PostgreSQL 15** — Banco persistente com volume

## 📁 Estrutura do Projeto

```
beatyhub/
├── index.html                    # SPA entry point
├── vite.config.js
├── docker-compose.yml            # Nginx + Backend + PostgreSQL
├── .env.example                  # Template de variáveis de ambiente
├── nginx/nginx.conf              # Reverse proxy config
│
├── src/                          # Frontend SPA (modular feature-based)
│   ├── main.js                   # Entry point da aplicação
│   ├── core/                     # Núcleo: router, state, auth, config
│   ├── shared/                   # Código compartilhado
│   │   ├── components/           # shell/, modal/, subscription-banner/
│   │   ├── styles/               # main.css, components.css, billing.css
│   │   └── utils/                # http, api-mappers, validation, toast
│   ├── features/                 # Módulos de negócio (18 módulos)
│   │   ├── auth/                 # Login + Registro
│   │   ├── dashboard/            # Dashboard + calendário
│   │   ├── clients/              # CRUD clientes
│   │   ├── appointments/         # CRUD agendamentos
│   │   ├── services/             # CRUD serviços
│   │   ├── professionals/        # CRUD profissionais
│   │   ├── financial/            # CRUD financeiro (entradas + saídas)
│   │   ├── inventory/            # CRUD estoque/produtos
│   │   ├── suppliers/            # CRUD fornecedores
│   │   ├── purchases/            # Registro de compras
│   │   ├── reports/              # Relatórios administrativos
│   │   ├── billing/              # Assinatura + Onboarding SaaS
│   │   ├── settings/             # Configurações do tenant
│   │   ├── account/              # Minha Conta (perfil + segurança)
│   │   ├── professional/         # Área do Profissional (7 páginas)
│   │   ├── master/               # Master Admin (5 submódulos)
│   │   ├── public/               # Landing page pública
│   │   └── landing/              # Landing page alternativa
│   └── assets/logos/
│
├── backend/                      # API REST Multi-Tenant
│   ├── Dockerfile
│   ├── server.multitenant.js     # Entry point (produção)
│   └── src/
│       ├── app.multitenant.js    # Express app multi-tenant (70+ endpoints)
│       ├── config/               # env.js, database.js
│       ├── models/               # 12 Sequelize models
│       ├── modules/              # 15 módulos (clean architecture)
│       │   ├── owner-*/          # 5 módulos CRUD (clients, services, appointments, financial, reports)
│       │   ├── billing/          # Billing completo (planos, assinaturas, faturas)
│       │   ├── tenants/          # Gestão de tenants + onboarding
│       │   ├── users/            # Gestão de usuários + perfil
│       │   ├── professionals/    # Detalhes profissionais
│       │   ├── inventory/        # Produtos + movimentação de estoque
│       │   ├── suppliers/        # Fornecedores
│       │   ├── purchases/        # Compras + itens
│       │   ├── financial/        # Payment transactions
│       │   └── public/           # Registro público
│       ├── controllers/          # 13 controllers (legacy, desativados)
│       ├── routes/               # 13 legacy + 11 owner = 24 route files
│       ├── shared/               # Middleware, errors, database, utils
│       ├── middleware/            # auth, validation, errorHandler (legacy)
│       ├── migrations/           # 31 migration files
│       └── seeders/              # 3 seed files
│
└── docs/                         # 22 documentos técnicos
```

## ✨ Funcionalidades

### 🌐 Landing Page de Vendas (Público)
- [x] **Hero Section** com call-to-action
- [x] **Seção de Funcionalidades** (8 cards destacando recursos)
- [x] **Seção de Planos Dinâmica** (busca planos do banco de dados)
- [x] **Formulário de Cadastro Completo**:
  - Tipo de conta (Estabelecimento ou Profissional Autônomo)
  - Dados do negócio (nome, CNPJ, telefone, email)
  - Endereço completo (CEP, rua, número, bairro, cidade, estado)
  - Dados do responsável (nome, CPF, email, telefone, senha)
  - Seleção de plano com exibição de preços e features
- [x] **Registro Público** - Cria tenant automaticamente com subdomain
- [x] Design responsivo com gradientes modernos

### 🔐 Autenticação
- [x] Login com validação e feedback (toast)
- [x] Registro multi-perfil (Estabelecimento, Profissional, Cliente)
- [x] **Registro Público via Landing Page** (cria tenant + owner)
- [x] Logout com limpeza de sessão
- [x] Guarda de rotas (redirect se não autenticado)
- [x] Persistência de sessão via `localStorage`

### 📊 Dashboard
- [x] Calendário interativo com navegação mês a mês
- [x] Eventos de agendamentos no calendário
- [x] Cards de ganhos (Hoje / Semana / Mês)
- [x] FAB para agendar rapidamente
- [x] Sidebar com navegação SPA

### 📅 Agendamentos (CRUD completo)
- [x] Listagem com filtro por data e status
- [x] Criar novo agendamento (modal)
- [x] Editar agendamento existente
- [x] Excluir com confirmação
- [x] Seleção de cliente, serviço, valor, horário, status, pagamento

### 💰 Financeiro (CRUD completo)
- [x] **3 Cards de Resumo**: Forma de Pagamento, Em Aberto, Concluído
- [x] Cálculos automáticos por método de pagamento
- [x] **Filtros de Data** (início/final)
- [x] **Tabela Entradas**: receitas com status e ações
- [x] **Tabela Saídas**: despesas com CRUD completo
- [x] Modal para adicionar/editar saídas
- [x] Exclusão com confirmação
- [x] **Gráficos Interativos** (Chart.js):
  - [x] Receitas vs Despesas (últimos 6 meses)
  - [x] Distribuição por Categoria (doughnut chart)
- [x] Exportação de relatórios

### 👥 Clientes (CRUD completo)
- [x] Tabela com nome, telefone, email, data de cadastro
- [x] Busca em tempo real (debounce)
- [x] Paginação
- [x] Criar / Editar / Excluir clientes

### 💼 Serviços
- [x] CRUD completo de serviços
- [x] **Categorias de Serviços** (campo category)
- [x] Tabela de categorias personalizadas
- [x] Filtros por categoria
- [x] Preço e duração

### 📦 Estoque/Inventário (OWNER)
- [x] CRUD completo de produtos
- [x] Controle de estoque (quantidade, mínimo)
- [x] Categorias de produtos
- [x] Fornecedores
- [x] Ajuste de estoque com histórico
- [x] Alertas de estoque baixo
- [x] Exportação CSV

### 🏪 Fornecedores (OWNER)
- [x] CRUD completo de fornecedores
- [x] Dados de contato
- [x] Histórico de compras

### 🛒 Compras (OWNER)
- [x] Registro de compras
- [x] Itens de compra
- [x] Movimentação automática de estoque
- [x] Vinculação com fornecedores

### ⚙️ Configurações
- [x] **Informações do Negócio**: nome, telefone, email, endereço, CNPJ
- [x] **Configurações Regionais**: fuso horário, idioma, moeda
- [x] **Identidade Visual**: logo, cores primária/secundária
- [x] **Horário de Funcionamento**: dias e horários por dia da semana
- [x] **Configurações de Pagamento (Pagar.me)**:
  - [x] API Key Pagar.me
  - [x] Dados bancários completos (banco, agência, conta)
  - [x] Dados do titular (nome, CPF/CNPJ)
  - [x] Tipo de conta e antecipação automática
  - [x] Recipient ID (gerado automaticamente)
- [x] **Notificações**: email de agendamentos, lembretes, relatórios

### ⚙️ Minha Conta
- [x] Tabs: Perfil, Segurança, Pagamentos, Notificações
- [x] Edição de nome (salva em localStorage + sessão)
- [x] Alteração de email com confirmação
- [x] Alteração de senha com validação
- [x] Alteração de telefone
- [x] Toggle de notificações (persistido)

### 💳 Assinatura SaaS
- [x] **Página de Onboarding**: escolha de plano para OWNER
- [x] Exibição de planos com recursos e limites
- [x] Destaque para plano mais popular
- [x] Período de teste gratuito (14 dias)
- [x] Assinatura com um clique
- [x] Integração com sistema de billing

### � Master Dashboard (MASTER role)
- [x] **Gestão de Tenants**: visualizar e gerenciar todos os tenants
- [x] **Gestão de Planos**:
  - [x] CRUD completo de planos de assinatura
  - [x] **Modal com Checkboxes de Funcionalidades** (13 funcionalidades)
  - [x] Campos individuais para limites (usuários, profissionais, clientes, etc.)
  - [x] Ativar/desativar planos
  - [x] Configuração de preços e trial days
- [x] **Billing Master**: visão geral de assinaturas e receitas
- [x] **Sistema**: configurações globais e métricas

### �️ Infraestrutura SPA
- [x] Router com History API (sem reload de página)
- [x] Lazy loading de módulos de página
- [x] State management centralizado com event bus
- [x] Sistema de modais padronizado (ESC, click-outside, focus trap)
- [x] Toast notifications (success, error, warning, info)
- [x] Validação de formulários com feedback visual
- [x] Formatação de moeda (R$) e datas (dd/mm/yyyy)
- [x] Seed data automático na primeira execução

## 🎨 Design System

### Cores
- **Teal** `#20B2AA` — Primary (botões, links, destaques)
- **Blue** `#2196F3` — Informações
- **Pink** `#E91E63` — Alertas, saídas, exclusão
- **Green** `#4CAF50` — Sucesso, concluído
- **Orange** `#F57C00` — Pendente, avisos

### Componentes
- Cards com sombras suaves (`box-shadow`)
- Botões arredondados (8px / 50px pill)
- Modais com overlay e animação fadeIn
- Dropdowns animados
- Badges de status coloridos
- Toast notifications com slide-in
- Paginação estilizada
- Formulários com estados de erro/sucesso

## 🚀 Como Executar

### Docker Compose (recomendado)
```bash
cp .env.example .env
npm install && npm run build
docker-compose up -d
docker exec beautyhub_backend npx sequelize-cli db:migrate
docker exec beautyhub_backend npx sequelize-cli db:seed:all
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:5001/api/health |
| PostgreSQL | localhost:5433 |

### Frontend apenas (dev)
```bash
npm install
npm run dev
```
Acesse: `http://localhost:3000`

## 🔑 Credenciais de Teste

**Multi-Tenant (PostgreSQL via API):**

| Perfil | Email | Senha | Tenant |
|--------|-------|-------|--------|
| MASTER | `master@beautyhub.com` | `123456` | — |
| OWNER | `owner@belezapura.com` | `123456` | `beleza-pura` |
| ADMIN | `admin@belezapura.com` | `123456` | `beleza-pura` |
| PROFESSIONAL | `prof@belezapura.com` | `123456` | `beleza-pura` |
| PROFESSIONAL | `carlos@belezapura.com` | `123456` | `beleza-pura` |

**APIs Públicas (sem autenticação):**

```bash
# Listar planos públicos
curl http://localhost:5001/api/public/plans

# Registrar novo tenant via landing page
curl -X POST http://localhost:5001/api/public/register \
  -H "Content-Type: application/json" \
  -d '{
    "accountType": "establishment",
    "business": {
      "name": "Salão Beleza Pura",
      "cnpj": "00.000.000/0000-00",
      "phone": "(11) 99999-9999",
      "email": "contato@salaobel ezapura.com.br"
    },
    "address": {
      "cep": "00000-000",
      "street": "Rua das Flores",
      "number": "123",
      "city": "São Paulo",
      "state": "SP"
    },
    "owner": {
      "name": "João Silva",
      "cpf": "000.000.000-00",
      "email": "joao@email.com",
      "phone": "(11) 99999-9999",
      "password": "senha123"
    },
    "planId": "uuid-do-plano"
  }'
```

> Novos tenants podem ser criados via landing page (`/`) ou `POST /api/public/register`.

## 📱 Rotas SPA

| Página | Rota | Auth | Role |
|--------|------|------|------|
| Landing | `/` | Não | — |
| Política de Privacidade | `/privacy-policy` | Não | — |
| Exclusão de Dados | `/data-deletion` | Não | — |
| Termos de Serviço | `/terms-of-service` | Não | — |
| Login | `/login` | Não | — |
| Registro | `/register` | Não | — |
| Dashboard | `/dashboard` | Sim | OWNER+ |
| Clientes | `/clients` | Sim | OWNER/ADMIN |
| Agendamentos | `/appointments` | Sim | OWNER/ADMIN |
| Serviços | `/services` | Sim | OWNER/ADMIN |
| Profissionais | `/professionals` | Sim | OWNER/ADMIN |
| Financeiro | `/financial` | Sim | OWNER/ADMIN |
| Estoque | `/inventory` | Sim | OWNER/ADMIN |
| Fornecedores | `/suppliers` | Sim | OWNER/ADMIN |
| Compras | `/purchases` | Sim | OWNER/ADMIN |
| Relatórios | `/reports` | Sim | OWNER/ADMIN |
| Detalhes Profissionais | `/professional-details` | Sim | OWNER/ADMIN |
| Transações Pagamento | `/payment-transactions` | Sim | OWNER/ADMIN |
| Formas de Pagamento | `/payment-methods` | Sim | OWNER/ADMIN |
| Usuários | `/users` | Sim | OWNER/ADMIN |
| Assinatura | `/billing` | Sim | OWNER/ADMIN |
| Configurações | `/settings` | Sim | OWNER |
| Minha Conta | `/account` | Sim | Todos |
| Meu Dashboard | `/professional/dashboard` | Sim | PROFESSIONAL |
| Meus Agendamentos | `/professional/appointments` | Sim | PROFESSIONAL |
| Meus Clientes | `/professional/clients` | Sim | PROFESSIONAL |
| Meus Ganhos | `/professional/earnings` | Sim | PROFESSIONAL |
| Minha Performance | `/professional/performance` | Sim | PROFESSIONAL |
| Disponibilidade | `/professional/availability` | Sim | PROFESSIONAL |
| Meu Perfil | `/professional/profile` | Sim | PROFESSIONAL |
| Master Dashboard | `/master` | Sim | MASTER |
| Master Tenants | `/master/tenants` | Sim | MASTER |
| Master Planos | `/master/plans` | Sim | MASTER |
| Master Billing | `/master/billing` | Sim | MASTER |
| Master Sistema | `/master/system` | Sim | MASTER |

## 🏗️ Arquitetura

### Frontend
- **Feature-Based Modules** — Organizado por domínio (`core/`, `shared/`, `features/`)
- **SPA Router** — Navegação client-side com History API + lazy loading
- **Component Shell** — Layout dashboard reutilizável (sidebar + header)
- **HTTP Client** — `shared/utils/http.js` preparado para integração backend

### Backend (Multi-Tenant SaaS)
- **Arquitetura Modular** — `modules/` (tenants, billing, users) + `shared/`
- **Multi-Tenant** — Single DB, Shared Schema, `tenant_id` em todas as entidades
- **RBAC Hierárquico** — MASTER → OWNER → ADMIN → PROFESSIONAL → CLIENT
- **Billing Completo** — Planos, assinaturas, faturas, usage metering, Pagar.me integration
- **Self-Signup** — Onboarding com trial automático de 14 dias
- **Security** — Brute force protection, account lockout, rate limiting
- **LGPD Compliance** — Data export, anonymization, retention policies
- **Webhook Resilience** — Idempotency, DLQ, retry com backoff exponencial
- **BaseRepository** — Escopo automático por tenant
- **22 tabelas** — PostgreSQL com Sequelize ORM + soft delete

### Infraestrutura
- **Docker Compose** — Nginx + Backend + PostgreSQL
- **Zero Frontend Dependencies** — Vanilla JS puro

> 📖 Documentação completa: [`docs/MULTI_TENANT_ARCHITECTURE.md`](docs/MULTI_TENANT_ARCHITECTURE.md)

## � API Endpoints Principais

### Públicos (sem autenticação)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/public/plans` | Listar planos públicos ativos |
| `POST` | `/api/public/register` | Registro público (cria tenant + owner) |
| `POST` | `/api/signup` | Self-signup com trial |
| `POST` | `/api/signup/autonomous` | Signup profissional autônomo |
| `GET` | `/api/signup/check-email` | Verificar disponibilidade email |
| `GET` | `/api/signup/check-document` | Verificar CPF/CNPJ |

### Multi-Tenant SaaS (MASTER)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/master/tenants` | Listar todos os tenants |
| `POST` | `/api/master/tenants` | Criar tenant |
| `GET` | `/api/master/tenants/:id` | Detalhes do tenant |
| `PUT` | `/api/master/tenants/:id` | Atualizar tenant |
| `DELETE` | `/api/master/tenants/:id` | Excluir tenant |

## 📊 Estado & Próximos Passos

### Concluído
- [x] Frontend SPA completo (34 páginas, 22 módulos, CRUD via API)
- [x] Backend API REST (70+ endpoints, JWT, Joi, Winston)
- [x] Docker Compose (Nginx + Backend + PostgreSQL)
- [x] 31 Migrations + 3 Seed files (multi-tenant demo data)
- [x] Refatoração modular frontend (core/ + shared/ + features/)
- [x] **Arquitetura Multi-Tenant SaaS** (tenants, billing, RBAC)
- [x] **Self-Signup & Onboarding** (trial automático)
- [x] **Brute Force Protection** (rate limiting + account lockout)
- [x] **Módulos OWNER Completos** (clients, services, appointments, financial, reports)
- [x] **Módulos Estoque** (products, suppliers, purchases com CRUD frontend)
- [x] **Landing Page de Vendas** (hero, features, planos dinâmicos, formulário)
- [x] **APIs Públicas** (planos públicos + registro de tenant)
- [x] **Área do Profissional** (7 páginas: dashboard, agendamentos, clientes, ganhos, performance, perfil, disponibilidade)
- [x] **Master Admin** (5 páginas: dashboard, tenants, planos, billing, sistema)
- [x] **Página de Onboarding SaaS** (escolha de plano para OWNER)
- [x] **Configurações do Tenant** (negócio, branding, horários, pagamento)
- [x] **Minha Conta** (perfil, segurança via API /api/profile)
- [x] **Modal de Planos com Checkboxes** (13 funcionalidades selecionáveis)
- [x] **Integração frontend ↔ backend** (todos módulos usam API REST)
- [x] **Testes de integração multi-tenant** (48 testes passando)
- [x] **Gestão de Usuários** (CRUD frontend para /api/users — admin+)
- [x] **Detalhes Profissionais** (CRUD frontend para /api/professional-details)
- [x] **Transações de Pagamento** (lista/filtros/detalhes para /api/payment-transactions)
- [x] **Formas de Pagamento** (CRUD frontend para /api/financial/payment-methods)

### Backend implementado (sem interface frontend dedicada)
- [x] **LGPD Compliance** (lgpd.service.js — data export, anonymization)
- [x] **Webhook Resilience** (webhookResilience.service.js — idempotency, DLQ, retry)
- [x] **Pagar.me Provider** (pagarme.provider.js + mock + stripe providers)
- [x] **Categorias de Serviços** (modelo + migration — sem UI de gestão)

### Pendente
- [ ] Gráficos financeiros (Chart.js — receitas vs despesas)
- [ ] Exportação CSV/PDF (financeiro, estoque)
- [ ] Email de boas-vindas após registro
- [ ] Verificação de email
- [ ] Upload de imagens (avatar, logo)
- [ ] Notificações push

## 📄 Licença

MIT

---

**Desenvolvido com 💙 para profissionais de beleza**
