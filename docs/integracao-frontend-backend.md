# Integração Frontend ↔ Backend — BelezaEcosystem

> Guia de referência para a camada de integração: como o frontend se comunica com o backend, tratamento de erros, autenticação, tenant context e padrões adotados.

---

## 1. Camada HTTP — `src/shared/utils/http.js`

Todos os requests do frontend passam pelo utilitário `http.js`, que encapsula:

- Injeção automática do JWT (`Authorization: Bearer <token>`)
- Injeção automática do header `X-Tenant-Slug`
- Refresh automático de token (quando o access token expira)
- Parsing de erros padronizados do backend
- Emissão de eventos globais (`unauthorized`, `subscriptionInactive`, `networkError`)

### Uso básico

```js
import { api } from '../shared/utils/http.js';

// GET
const res = await api.get('/campaigns');

// POST
const res = await api.post('/campaigns', { name: 'Promo', channel: 'whatsapp' });

// PATCH / DELETE
await api.patch('/campaigns/123', { status: 'active' });
await api.delete('/campaigns/123');
```

---

## 2. Classes de Erro

| Classe | HTTP | Quando é lançada |
|--------|------|-----------------|
| `ApiError` | 4xx/5xx | Erro genérico da API |
| `AuthError` | 401 | Token ausente, inválido ou expirado |
| `SubscriptionError` | 402 | Assinatura inativa, suspensa ou expirada |

```js
import { ApiError, AuthError, SubscriptionError } from '../shared/utils/http.js';

try {
  await api.post('/mini-site/publish');
} catch (err) {
  if (err instanceof SubscriptionError) {
    showToast('Sua assinatura está inativa.', 'error');
  } else {
    showToast(err?.message || 'Erro ao publicar.', 'error');
  }
}
```

---

## 3. Eventos Globais HTTP

O `router.js` escuta eventos globais emitidos pelo `http.js`:

| Evento | Quando | Ação no router |
|--------|--------|----------------|
| `unauthorized` | 401 — token inválido/expirado | Logout + redirect `/login` |
| `subscriptionInactive` | 402 — subscription bloqueada | Toast de erro |
| `networkError` | Falha de rede | Toast de aviso |

```js
// src/core/router.js
onHttpEvent('unauthorized', () => {
  showToast('Sessão expirada. Faça login novamente.', 'warning');
  logout();
  navigateTo('/login');
});
```

---

## 4. Formato de Resposta da API

### Sucesso

```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso.",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5,
    "has_more": true
  }
}
```

### Erro

```json
{
  "success": false,
  "message": "Descrição amigável do erro.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": { "name": "Campo obrigatório" }
  }
}
```

O frontend deve sempre ler `error.code` para tratamento programático e `message` para exibição ao usuário.

---

## 5. Autenticação JWT

### Fluxo

```
POST /api/auth/login
  → { accessToken, refreshToken, user }

# Access token: 1h de validade
# Refresh token: 7d de validade

POST /api/auth/refresh-token
  → { accessToken }  (quando access expirar)
```

### Headers obrigatórios (rotas protegidas)

```
Authorization: Bearer <accessToken>
X-Tenant-Slug: <slug_do_tenant>
```

### Armazenamento

- Tokens salvos via `src/shared/utils/localStorage.js`
- `getCurrentUser()` e `isAuthenticated()` disponíveis em `src/core/state.js`

---

## 6. Tenant Context

O `X-Tenant-Slug` é detectado pelo `core/config.js` a partir de:
1. Subdomain da URL (ex: `bella-arte.belezaecosystem.com.br`)
2. Fallback: slug salvo em localStorage após login

O backend resolve o tenant via `tenantResolver` middleware e injeta `req.tenantId` em todos os requests autenticados.

---

## 7. Subscription Gate

Respostas `HTTP 402` indicam assinatura bloqueada:

| `error.code` | Situação |
|-------------|----------|
| `SUBSCRIPTION_INACTIVE` | Tenant suspenso/cancelado/expirado |
| `SUBSCRIPTION_PAST_DUE` | Em atraso — apenas writes bloqueados |

O `http.js` trata 402 automaticamente lançando `SubscriptionError`. O frontend pode redirecionar para `/billing` ou mostrar toast.

---

## 8. Paginação

Endpoints de lista retornam `meta` com:

```js
const res = await api.get('/campaigns?page=1&limit=20');
// res.meta.total   → total de registros
// res.meta.page    → página atual
// res.meta.pages   → total de páginas
// res.meta.has_more → boolean
```

Parâmetros de query suportados (onde aplicável):
- `page`, `limit` — paginação
- `search` — busca textual
- `status`, `channel` — filtros
- `sortBy`, `sortOrder` — ordenação (`ASC`/`DESC`)

---

## 9. Fallback Pattern (Frontend)

Módulos do frontend usam o padrão de fallback gracioso quando a API está indisponível:

```js
async function loadData() {
  try {
    const [campaigns, metrics] = await Promise.all([
      api.get('/campaigns').catch(() => null),
      api.get('/marketing/metrics').catch(() => null),
    ]);
    // usar dados reais ou cair no fallback
  } catch (_) {
    // fallback silencioso — dados padrão ou array vazio
  }
}
```

Módulos que adotam este padrão: `marketing.js`, `ai-assistant.js`, `team-commissions.js`, `help.js`, `mini-site.js`.

---

## 10. Rate Limits por Endpoint

| Grupo | Rota | Limite | Janela |
|-------|------|--------|--------|
| Auth | `POST /api/auth/login`, `/register` | 20 req | 15 min |
| Help/Contato | `POST /api/help/contact` | 5 req | 60 min |
| Marketing writes | `POST/PATCH /api/marketing/*` | 30 req | 15 min |
| AI assistant | `GET/POST /api/ai-assistant/*` | 60 req | 15 min |
| Mini-site público | `GET /api/public/mini-site/*` | 60 req | 1 min |

Respostas de rate limit: HTTP 429 com `error.code: RATE_LIMIT_EXCEEDED`.

---

## 11. Mapeamento Frontend → Endpoint

| Módulo Frontend | Método | Endpoint Backend |
|----------------|--------|-----------------|
| `marketing.js` | GET | `/api/marketing/metrics` |
| `marketing.js` | GET | `/api/marketing/campaigns` |
| `marketing.js` | PATCH | `/api/marketing/automations/:id/toggle` |
| `mini-site.js` | GET | `/api/mini-site` |
| `mini-site.js` | PATCH | `/api/mini-site` |
| `mini-site.js` | POST | `/api/mini-site/publish` |
| `mini-site.js` | DELETE | `/api/mini-site/publish` |
| `help.js` | GET | `/api/help/categories` |
| `help.js` | POST | `/api/help/contact` |
| `ai-assistant.js` | GET | `/api/ai-assistant` |
| `ai-assistant.js` | GET | `/api/ai-assistant/status` |
| `team-commissions.js` | GET | `/api/professionals/commissions` |
| `team-commissions.js` | GET | `/api/professionals` |
| `professionals.js` | GET | `/api/professionals` |
| `professional-area/` | GET | `/api/professional/appointments` |
| `professional-area/` | GET | `/api/professional/clients` |
| `professional-area/` | GET | `/api/professional/earnings` |
| `billing.js` | GET | `/api/billing/subscription` |
| `dashboard.js` | GET | `/api/appointments`, `/api/clients`, `/api/financial/*` |

> Referência completa de endpoints: [`integracao-api.md`](integracao-api.md)
