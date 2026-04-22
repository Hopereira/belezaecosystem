# Arquitetura do Sistema

O Beleza Ecosystem é uma aplicação **full-stack** composta por um **frontend SPA** (Vanilla JavaScript) e um **backend API REST** (Node.js/Express), orquestrados via **Docker Compose** com Nginx como reverse proxy e PostgreSQL como banco de dados.

---

## Stack Tecnológico

### Frontend

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Build Tool | Vite | 5.x |
| Linguagem | Vanilla JavaScript (ES6 Modules) | ES2020+ |
| Markup | HTML5 | - |
| Estilos | CSS3 (Custom Properties) | - |
| Ícones | Font Awesome | 6.4 |
| Fonte | Montserrat (Google Fonts) | 400–800 |
| Persistência (atual) | localStorage | Web API |
| PWA | manifest.json | - |

### Backend (Multi-Tenant SaaS)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.x |
| ORM | Sequelize | 6.x |
| Banco de Dados | PostgreSQL | 15 |
| Autenticação | JWT (jsonwebtoken) + bcryptjs | - |
| Validação | Joi | 17.x |
| Logging | Winston | 3.x |
| Rate Limiting | express-rate-limit | 7.x |
| Segurança | Helmet + CORS | - |
| **Multi-Tenancy** | Single DB + Shared Schema | - |
| **RBAC** | MASTER → OWNER → ADMIN → PROF → CLIENT | - |

> 📖 Documentação detalhada: [`MULTI_TENANT_ARCHITECTURE.md`](MULTI_TENANT_ARCHITECTURE.md)

### Infraestrutura

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Containerização | Docker + Docker Compose | - |
| Reverse Proxy | Nginx | stable-alpine |
| Orquestração | docker-compose.yml | 3.8 |

---

## Estrutura de Diretórios

```bash
beatyhub/
├── index.html                          # SPA entry point
├── vite.config.js                      # Vite config (SPA mode)
├── package.json                        # Frontend dependencies
├── manifest.json                       # PWA manifest
├── docker-compose.yml                  # Orquestração: Nginx + Backend + PostgreSQL
├── .env.example                        # Variáveis de ambiente (template)
├── .env                                # Variáveis de ambiente (local, gitignored)
│
├── nginx/
│   └── nginx.conf                      # Reverse proxy + static file server
│
├── public/                             # Assets estáticos copiados para dist/ pelo Vite
│   ├── manifest.json
│   └── src/assets/logos/logo.png
│
├── dist/                               # Build de produção (gerado por `npm run build`)
│
├── backend/
│   ├── Dockerfile                      # Container Node.js 20 Alpine
│   ├── package.json                    # Backend dependencies
│   ├── .sequelizerc                    # Sequelize CLI paths
│   ├── server.js                       # Entry point (DB connect + listen)
│   └── src/
│       ├── app.js                      # Express app original (single-tenant)
│       ├── app.multitenant.js          # Express app multi-tenant (SaaS)
│       ├── config/
│       │   ├── env.js                  # Environment variables loader
│       │   └── database.js             # Sequelize DB config (dev/test/prod)
│       │
│       ├── modules/                    # ★ MÓDULOS MULTI-TENANT ★
│       │   ├── index.js                # Inicializador de módulos
│       │   ├── tenants/                # Gestão de tenants (estabelecimentos)
│       │   │   ├── tenant.model.js
│       │   │   ├── tenant.repository.js
│       │   │   ├── tenant.service.js
│       │   │   ├── tenant.controller.js
│       │   │   ├── tenant.routes.js
│       │   │   ├── tenant.validation.js
│       │   │   └── index.js
│       │   ├── billing/                # Planos, assinaturas, faturas
│       │   │   ├── subscriptionPlan.model.js
│       │   │   ├── subscription.model.js
│       │   │   ├── invoice.model.js
│       │   │   ├── usageLog.model.js
│       │   │   └── index.js
│       │   └── users/                  # Usuários multi-tenant
│       │       ├── user.model.js       # tenant_id + RBAC
│       │       ├── user.repository.js
│       │       ├── user.service.js
│       │       ├── user.controller.js
│       │       ├── user.routes.js
│       │       ├── user.validation.js
│       │       └── index.js
│       │
│       ├── shared/                     # ★ CÓDIGO COMPARTILHADO ★
│       │   ├── constants/index.js      # Enums (ROLES, STATUS, etc.)
│       │   ├── database/
│       │   │   ├── connection.js       # Sequelize instance
│       │   │   └── BaseRepository.js   # Escopo automático por tenant
│       │   ├── errors/AppError.js      # Custom error classes
│       │   ├── middleware/
│       │   │   ├── auth.js             # JWT + RBAC hierárquico
│       │   │   ├── tenantResolver.js   # Resolve tenant (subdomain/header)
│       │   │   ├── errorHandler.js     # Global error handler
│       │   │   └── validation.js       # Joi + CPF/CNPJ validators
│       │   └── utils/
│       │       ├── logger.js           # Winston + tenant context
│       │       └── jwt.js              # JWT com tenant_id
│       │
│       ├── models/                     # Models originais (legado)
│       ├── controllers/                # Controllers originais (legado)
│       ├── routes/                     # Routes originais (legado)
│       ├── middleware/                 # Middleware original
│       ├── utils/                      # Utils original
│       ├── migrations/                 # 16 migration files
│       └── seeders/                    # Seeds (planos, tenant demo, users)
│
├── src/                                # Frontend source (modular feature-based)
│   ├── main.js                         # Entry point: init data → modals → router
│   │
│   ├── core/                           # Núcleo da aplicação
│   │   ├── index.js                    # Barrel export
│   │   ├── config.js                   # Configurações globais (API_BASE_URL, ROLES)
│   │   ├── router.js                   # SPA Router (History API, Auth Guard)
│   │   ├── state.js                    # State management + event bus
│   │   └── auth.js                     # Autenticação (login/register/logout)
│   │
│   ├── shared/                         # Código compartilhado entre features
│   │   ├── components/
│   │   │   ├── index.js                # Barrel export
│   │   │   ├── shell/shell.js          # Layout dashboard (sidebar + header + content)
│   │   │   └── modal/modal.js          # Sistema de modais (ESC, click-outside)
│   │   ├── styles/
│   │   │   ├── main.css                # Design system (tokens, reset, utilities)
│   │   │   └── components.css          # Componentes CSS compartilhados
│   │   └── utils/
│   │       ├── index.js                # Barrel export
│   │       ├── localStorage.js         # CRUD helpers + seed data + constantes
│   │       ├── validation.js           # Validação de formulários
│   │       ├── formatting.js           # Formatação (moeda, data) — re-export
│   │       ├── toast.js                # Notificações toast
│   │       └── http.js                 # Fetch wrapper (para integração backend)
│   │
│   ├── features/                       # Módulos de negócio (por domínio)
│   │   ├── landing/pages/landing.js    # /
│   │   ├── auth/
│   │   │   ├── pages/login.js          # /login
│   │   │   ├── pages/register.js       # /register
│   │   │   └── styles/auth.css         # Estilos de autenticação
│   │   ├── dashboard/
│   │   │   ├── pages/dashboard.js      # /dashboard
│   │   │   └── styles/dashboard.css    # Estilos do dashboard
│   │   ├── appointments/
│   │   │   ├── pages/appointments.js   # /appointments
│   │   │   └── styles/                 # (futuro)
│   │   ├── financial/
│   │   │   ├── pages/financial.js      # /financial
│   │   │   └── styles/                 # (futuro)
│   │   ├── clients/
│   │   │   ├── pages/clients.js        # /clients
│   │   │   └── styles/                 # (futuro)
│   │   └── account/
│   │       ├── pages/account.js        # /account
│   │       └── styles/                 # (futuro)
│   │
│   └── assets/
│       └── logos/
│
└── docs/                               # Documentação
    ├── architecture.md                 # Este arquivo
    ├── components.md                   # Guia de componentes
    └── project_overview.md             # Visão geral do projeto
```

---

## Fluxo de Inicialização

```bash
index.html
  └─ <script type="module" src="/src/main.js">
       ├─ 1. initializeData()       → shared/utils/localStorage.js (seed se vazio)
       ├─ 2. initModalSystem()      → shared/components/modal/modal.js (ESC + click-outside)
       └─ 3. initRouter()           → core/router.js
                                       ├─ Registra popstate listener
                                       ├─ Intercepta clicks em <a>
                                       └─ loadRoute(path)
                                            ├─ Auth guard (redirect /login)
                                            ├─ import('../features/xxx/pages/xxx.js')  ← lazy
                                            ├─ mod.render()  → injeta HTML no #app
                                            └─ mod.init()    → bind eventos, retorna cleanup
```

---

## Padrão de Módulo de Página

Cada página é um módulo ES6 que exporta duas funções:

```javascript
// src/features/{feature}/pages/{feature}.js

export function render() {
    // Injeta HTML no DOM
    // Para páginas autenticadas: renderShell('pageName') + setContent(html)
    // Para páginas públicas: document.getElementById('app').innerHTML = html
}

export function init() {
    // Bind de eventos, inicialização de estado local
    // Retorna função de cleanup (ou null)
    return () => {
        // Cleanup: remove listeners, reseta estado
    };
}
```

### Ciclo de Vida

1. **Router** detecta mudança de URL
2. Executa `cleanup()` da página anterior (se existir)
3. Importa módulo da nova página (lazy loading)
4. Chama `render()` → injeta HTML
5. Chama `init()` → bind eventos, retorna cleanup

---

## SPA Router (`router.js`)

### Rotas Definidas

| Rota | Página | Auth | Módulo |
|------|--------|------|--------|
| `/` | Landing | Não | `landing.js` |
| `/login` | Login | Não | `login.js` |
| `/register` | Cadastro | Não | `register.js` |
| `/dashboard` | Dashboard | Sim | `dashboard.js` |
| `/appointments` | Agendamentos | Sim | `appointments.js` |
| `/financial` | Financeiro | Sim | `financial.js` |
| `/clients` | Clientes | Sim | `clients.js` |
| `/account` | Minha Conta | Sim | `account.js` |

### Funcionalidades do Router

- **History API**: `pushState` / `popstate` para navegação sem reload
- **Auth Guard**: Rotas protegidas redirecionam para `/login` se não autenticado
- **Redirect Guard**: Usuário autenticado em `/login` ou `/register` é redirecionado para `/dashboard`
- **Link Interception**: Todos os `<a href>` internos são interceptados para navegação SPA
- **Lazy Loading**: Módulos de página são importados sob demanda via `import()` dinâmico
- **Cleanup**: Cada página pode retornar uma função de limpeza executada ao sair

---

## State Management (`state.js`)

Estado centralizado com event bus simples:

```javascript
// Leitura
getCurrentUser()      // Retorna objeto do usuário ou null
isAuthenticated()     // Boolean
getUserRole()         // 'admin' | 'professional' | 'client' | null
getCurrentPage()      // String da página atual

// Escrita
setCurrentUser(user)  // Salva em memória + localStorage
logout()              // Limpa sessão

// Eventos
on('userChanged', callback)    // Listener para mudança de usuário
on('pageChanged', callback)    // Listener para mudança de página
on('logout', callback)         // Listener para logout
off('userChanged', callback)   // Remove listener
```

---

## Persistência (`localStorage.js`)

### Storage Keys

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `bh_users` | Array | Usuários cadastrados |
| `bh_currentUser` | Object | Sessão do usuário logado |
| `bh_appointments` | Array | Agendamentos |
| `bh_financial` | Array | Transações financeiras |
| `bh_clients` | Array | Clientes cadastrados |
| `bh_settings` | Object | Preferências do usuário |

### Helpers CRUD

```javascript
// Operações básicas
saveItem(key, data)              // Salva qualquer valor
getItem(key)                     // Lê qualquer valor
removeItem(key)                  // Remove chave

// Operações em coleções (arrays)
getCollection(key)               // Retorna array (ou [])
addToCollection(key, item)       // Adiciona com ID gerado
updateInCollection(key, id, data)// Atualiza por ID
removeFromCollection(key, id)    // Remove por ID
findInCollection(key, id)        // Busca por ID
findByField(key, field, value)   // Busca por campo
filterCollection(key, filterFn)  // Filtra com função

// Utilitários
generateId()                     // Gera ID único (timestamp + random)
initializeData()                 // Seed data se vazio
resetData()                      // Reseta tudo para seed
```

### Seed Data (primeira execução)

| Coleção | Registros | Descrição |
|---------|-----------|-----------|
| Users | 2 | Admin (`adm@adm`) + Profissional (`prof@prof`) |
| Clients | 10 | Clientes de exemplo |
| Appointments | 10 | Agendamentos variados (completed, pending, scheduled) |
| Financial | 8 | 5 entradas + 3 saídas |

---

## Autenticação (`auth.js`)

### Fluxo de Login

```bash
Usuário submete form → handleLogin(email, password)
  ├─ Busca em bh_users por email + password
  ├─ Se encontrou → cria sessionUser com token simulado
  │   ├─ setCurrentUser(sessionUser) → salva em bh_currentUser
  │   └─ return { success: true, user }
  └─ Se não encontrou → return { success: false, message }
```

### Fluxo de Registro

```bash
Usuário submete form → handleRegister({ name, email, password, ... })
  ├─ Validações (campos obrigatórios, senha ≥ 6, email único)
  ├─ Mapeia role (estabelecimento→admin, profissional→professional, cliente→client)
  ├─ addToCollection(KEYS.USERS, newUser)
  └─ return { success: true, user }
```

---

## Shell Layout (`shell.js`)

O `shell.js` renderiza o layout padrão do dashboard:

```bash
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │          │ │ Header (greeting + avatar)      │ │
│ │ Sidebar  │ ├────────────────────────────────┤ │
│ │          │ │                                │ │
│ │ - Início │ │  #page-content                 │ │
│ │ - Client │ │  (conteúdo dinâmico da página) │ │
│ │ - Agenda │ │                                │ │
│ │ - Financ │ │                                │ │
│ │ - Estoqu │ │                                │ │
│ │ - Serviç │ │                                │ │
│ │          │ │                                │ │
│ │ [Sair]   │ │                                │ │
│ └──────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### API

```javascript
renderShell('dashboard')         // Renderiza shell completo no #app
getContentArea()                 // Retorna elemento #page-content
setContent(html)                 // Atualiza apenas o conteúdo interno
```

---

## Sistema de Modais (`modal.js`)

### API

```javascript
openModal('appointment')         // Abre #modal-appointment
closeModal('appointment')        // Fecha #modal-appointment
closeTopModal()                  // Fecha o modal mais recente
closeAllModals()                 // Fecha todos
initModalSystem()                // Registra handlers globais (ESC + click-outside)
```

### Convenção de IDs

Modais devem ter `id="modal-{tipo}"` e classe `modal-overlay`:

```html
<div id="modal-appointment" class="modal-overlay" style="display:none;">
    <div class="modal-content">...</div>
</div>
```

---

## Design System (`main.css`)

### CSS Custom Properties (Tokens)

```css
/* Cores */
--primary-color: #20B2AA;
--primary-dark: #008B8B;
--primary-light: rgba(32, 178, 170, 0.1);
--color-blue / --color-pink / --color-green / --color-orange / --color-red

/* Neutros */
--text-dark: #333333;
--text-muted: #666666;
--text-light: #999999;
--border-color: #e0e0e0;
--bg-light: #f5f7fa;

/* Sombras */
--shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
--shadow-sm / --shadow-lg

/* Espaçamento */
--space-xs (0.25rem) → --space-2xl (3rem)

/* Border Radius */
--radius-sm (4px) → --radius-full (50px)

/* Tipografia */
--font-family: 'Montserrat', sans-serif;
--font-size-xs (0.75rem) → --font-size-2xl (2rem)

/* Transições */
--transition-fast: 0.2s ease;
--transition-base: 0.3s ease;
```

### Utilitários CSS Incluídos

- **Toast Notifications**: `.toast-container`, `.toast`, `.toast-success/error/warning/info`
- **Loading Spinner**: `.spinner`, `.spinner-sm`
- **Form Validation**: `.input-error`, `.input-success`, `.error-message`
- **Pagination**: `.pagination`, `.pagination-btn`, `.pagination-info`
- **Helpers**: `.sr-only`, `.hidden`, `.visible`, `.text-center`, `.text-muted`

---

## Arquitetura Docker

```bash
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Nginx      │  │   Backend    │  │   PostgreSQL     │  │
│  │  :8080→:80   │  │  :5001→:5001 │  │  :5433→:5432     │  │
│  │              │  │              │  │                  │  │
│  │ Static files │──│ Express API  │──│ BelezaEcosystem_db     │  │
│  │ (dist/)      │  │ 50+ endpoints│  │ 10 tabelas       │  │
│  │              │  │ JWT + bcrypt │  │ Soft delete      │  │
│  │ /api/* proxy │  │ Joi + Winston│  │ UUID PKs         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  Network: BelezaEcosystem_network (bridge)                        │
│  Volume: db_data (PostgreSQL persistent)                    │
└─────────────────────────────────────────────────────────────┘
```

### Portas

| Serviço | Host | Container | URL |
|---------|------|-----------|-----|
| Nginx (Frontend) | 8080 | 80 | http://localhost:8080 |
| Backend (API) | 5001 | 5001 | http://localhost:5001/api/health |
| PostgreSQL | 5433 | 5432 | localhost:5433 |

---

## Backend API

### Formato de Resposta Padrão

```json
{
  "success": true,
  "message": "Descrição da operação.",
  "data": { },
  "pagination": { "total": 10, "page": 1, "limit": 10 }
}
```

### Endpoints (50+)

| Grupo | Endpoints | Auth | Roles |
|-------|-----------|------|-------|
| Auth | POST register, login, refresh-token; GET me | Parcial | Todos |
| Profile | GET, PUT, PUT /password | Sim | Todos |
| Users | GET list, GET/:id, PUT, DELETE, PUT /password, PUT /role | Sim | MASTER, ADMIN |
| Establishments | CRUD + GET /professionals, /services | Sim | MASTER, ADMIN |
| Professionals | CRUD + GET /appointments | Sim | MASTER, ADMIN, PROFESSIONAL |
| Services | CRUD | Sim | Todos (write: MASTER, ADMIN) |
| Clients | CRUD + GET /appointments + search | Sim | MASTER, ADMIN, PROFESSIONAL |
| Appointments | CRUD + GET /calendar + overlap check | Sim | MASTER, ADMIN, PROFESSIONAL |
| Financial | Summary + Entries CRUD + Exits CRUD + Payment Methods CRUD | Sim | MASTER, ADMIN |
| Notifications | GET list, PUT /read, DELETE | Sim | Todos |
| Health | GET /api/health | Não | - |

### Segurança

- **JWT**: Access token (1h) + Refresh token (7d)
- **bcrypt**: Hash de senhas (salt rounds: 10)
- **Helmet**: Headers de segurança
- **Rate Limiting**: 200 req/15min geral, 20 req/15min para auth
- **CORS**: Configurável via env
- **Soft Delete**: Todas as tabelas usam `paranoid: true`
- **Role-based Authorization**: MASTER > ADMIN > PROFESSIONAL > CLIENT

---

## Performance

- **Zero Frameworks**: Vanilla JS elimina overhead de React/Vue/Angular
- **Lazy Loading**: Módulos de página carregados sob demanda via `import()` dinâmico
- **Single Entry Point**: Apenas `index.html`
- **CSS Variables**: Tema centralizado, sem pré-processadores
- **Event Delegation**: Listeners no container pai
- **Debounce**: Busca de clientes com debounce de 300ms
- **Gzip**: Nginx comprime JS, CSS, JSON automaticamente
- **Docker Health Checks**: Backend e DB com health checks automáticos

---

## Diagrama de Dependências (Frontend)

```bash
src/main.js
├── shared/utils/localStorage.js       ← initializeData()
├── shared/components/modal/modal.js   ← initModalSystem()
└── core/router.js                     ← initRouter()
    ├── core/state.js                  ← isAuthenticated(), setCurrentPage()
    └── features/*/pages/*.js          ← import() dinâmico (lazy)
        ├── shared/components/shell/shell.js  ← renderShell()
        │   ├── core/state.js                 ← getCurrentUser()
        │   ├── core/auth.js                  ← handleLogout()
        │   ├── core/router.js                ← navigateTo()
        │   └── shared/components/modal/modal.js
        ├── shared/utils/localStorage.js      ← CRUD
        ├── shared/utils/validation.js        ← formatação
        ├── shared/utils/toast.js             ← feedback
        └── shared/components/modal/modal.js  ← openModal/closeModal
```

### Princípios da Arquitetura Modular

- **core/**: Funcionalidades essenciais da SPA (router, state, auth, config)
- **shared/**: Componentes e utilitários reutilizáveis entre features
- **features/**: Módulos de negócio organizados por domínio
- Cada feature contém `pages/`, `styles/`, e futuramente `components/`
- Barrel exports (`index.js`) facilitam importações limpas
- `shared/utils/http.js` preparado para integração com backend API

---

## O Que Falta (Integração Frontend ↔ Backend)

| Prioridade | Tarefa | Descrição |
|-----------|--------|----------|
| **Alta** | Integração Auth | Substituir `localStorage` auth por chamadas JWT ao backend |
| **Alta** | API Client (fetch) | Criar módulo `api.js` com fetch wrapper + token management |
| **Alta** | Integração CRUD | Substituir `localStorage` CRUD por chamadas REST |
| Média | Upload de imagens | Avatar do usuário e fotos de serviços |
| Média | Gráficos financeiros | Chart.js para visualização de dados |
| Média | Relatórios PDF | Exportação de relatórios financeiros |
| Média | Notificações push | Web Push API |
| Baixa | PWA offline | Service Worker completo |
| Baixa | Testes automatizados | Vitest + Playwright |
| Baixa | Estoque e Serviços | Páginas de gestão de estoque e catálogo de serviços |
