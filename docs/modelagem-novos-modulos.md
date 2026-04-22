# Modelagem — Módulos Phase 6/7

> Documenta a estrutura de banco, models, regras de negócio e pontos de extensão dos módulos criados nas Fases 6 e 7.

---

## 1. marketing_campaigns

**Propósito:** Registrar campanhas de comunicação (WhatsApp, SMS, e-mail, push) por tenant.

| Coluna             | Tipo                | Notas                                                   |
|--------------------|---------------------|---------------------------------------------------------|
| `id`               | UUID PK             |                                                         |
| `tenant_id`        | UUID FK → tenants   | CASCADE DELETE                                          |
| `name`             | VARCHAR(255)        | Obrigatório, trim no service                            |
| `channel`          | ENUM                | `whatsapp | sms | email | push`                         |
| `status`           | ENUM                | `draft | active | paused | completed | cancelled`       |
| `message_template` | TEXT                | Nullable                                                |
| `audience_segment` | VARCHAR(50)         | Default: `all`                                          |
| `audience_size`    | INTEGER             | Default: 0                                              |
| `sent_count`       | INTEGER             | Default: 0 (incrementado por worker)                   |
| `conversion_count` | INTEGER             | Default: 0                                              |
| `scheduled_at`     | TIMESTAMP           | Nullable                                                |
| `sent_at`          | TIMESTAMP           | Nullable (definido quando envio realizado)              |
| `created_by`       | UUID FK → users     | SET NULL on delete                                      |
| `created_at`       | TIMESTAMP           |                                                         |
| `updated_at`       | TIMESTAMP           |                                                         |

**Índices:**
- `(tenant_id)` — listagem por tenant
- `(tenant_id, status)` — filtro de status
- `(tenant_id, channel)` — filtro de canal
- `(tenant_id, created_at)` — range de datas
- `(scheduled_at)` — upcoming campaigns

**Regras de negócio:**
- `name`/`channel` não editáveis em status `active` ou `completed`
- `conversion_rate` é derivado (`conversion_count / sent_count * 100`) — não persistido
- O service expõe o serializer `_serializeCampaign` que inclui `conversion_rate` calculado

---

## 2. marketing_automations

**Propósito:** Automações de relacionamento pré-definidas por trigger. Semeadas automaticamente no 1º acesso de cada tenant.

| Coluna             | Tipo                | Notas                                                         |
|--------------------|---------------------|---------------------------------------------------------------|
| `id`               | UUID PK             |                                                               |
| `tenant_id`        | UUID FK → tenants   | CASCADE DELETE                                                |
| `slug`             | VARCHAR(50)         | Identificador estável: `confirm | reminder | birthday | ...`  |
| `name`             | VARCHAR(255)        |                                                               |
| `description`      | TEXT                | Nullable                                                      |
| `trigger_type`     | ENUM                | `appointment_confirmed | appointment_reminder_24h | client_inactive_30d | ...` |
| `channel`          | ENUM                | `whatsapp | sms | email | push`                              |
| `message_template` | TEXT                | Nullable                                                      |
| `enabled`          | BOOLEAN             | Default: false (cada automação tem default próprio)           |
| `executions_count` | INTEGER             | Default: 0                                                    |
| `last_executed_at` | TIMESTAMP           | Nullable                                                      |

**Constraint único:** `(tenant_id, slug)` — uma automação de cada tipo por tenant.

**Automações default semeadas:**
- `confirm` (enabled: true), `reminder` (true), `reactivate` (false), `birthday` (true), `review` (false)

---

## 3. mini_site_configs

**Propósito:** Uma linha por tenant. Configuração completa do mini-site público do salão.

| Coluna                   | Tipo         | Notas                                          |
|--------------------------|--------------|------------------------------------------------|
| `id`                     | UUID PK      |                                                |
| `tenant_id`              | UUID FK UNIQUE | Unique — um site por tenant                  |
| `slug`                   | VARCHAR(100) | Unique global; padrão regex `[a-z0-9][a-z0-9-]{2,59}` |
| `published`              | BOOLEAN      | Default: false                                 |
| `title`                  | VARCHAR(255) | Nullable                                       |
| `description`            | TEXT         | Nullable                                       |
| `hero_image_url`         | TEXT         | Nullable, URL HTTP/HTTPS                       |
| `cover_color`            | VARCHAR(20)  | Hex color (#RGB ou #RRGGBB), default `#603322` |
| `contact_phone`          | VARCHAR(20)  | Nullable                                       |
| `whatsapp`               | VARCHAR(20)  | Nullable                                       |
| `address`                | VARCHAR(500) | Nullable                                       |
| `booking_enabled`        | BOOLEAN      | Default: false                                 |
| `online_payment_enabled` | BOOLEAN      | Default: false                                 |
| `reviews_enabled`        | BOOLEAN      | Default: true                                  |
| `services_highlight`     | JSONB        | Array de UUIDs (max 20)                        |
| `professionals_highlight`| JSONB        | Array de UUIDs (max 20)                        |
| `published_at`           | TIMESTAMP    | Nullable — timestamp da última publicação      |

**Regras de negócio:**
- Slug saneado automaticamente (`_slugify`) antes de validação
- Slugs reservados bloqueados no service: `api, admin, login, ...`
- `publish()` exige `title` preenchido (ValidationError caso contrário)
- Endpoint público `GET /public/mini-site/:slug` retorna `null` → 404 se `published = false`
- `updateConfig` filtra via lista ALLOWED (whitelist de campos)

---

## 4. help_contact_requests

**Propósito:** Registrar mensagens enviadas pelo formulário de suporte.

| Coluna      | Tipo                | Notas                                                |
|-------------|---------------------|------------------------------------------------------|
| `id`        | UUID PK             |                                                      |
| `tenant_id` | UUID FK nullable    | SET NULL — pode vir de usuário não autenticado       |
| `user_id`   | UUID FK nullable    | SET NULL                                             |
| `name`      | VARCHAR(150)        | Obrigatório, trim                                    |
| `email`     | VARCHAR(255)        | Obrigatório, lowercase+trim                          |
| `subject`   | VARCHAR(255)        | Obrigatório, min 5 chars                             |
| `category`  | VARCHAR(50)         | Nullable, enum válido                                |
| `message`   | TEXT                | Obrigatório, min 20 chars                            |
| `status`    | ENUM                | `open | in_progress | resolved | closed`; default `open` |

**Anti-spam:** HelpService verifica máx. 3 submissões do mesmo e-mail em 1 hora via `Op.gte`.

**Índices:**
- `(tenant_id)`, `(status)`, `(created_at)`, `(email, created_at)`

---

## 5. commission_settings *(Phase 7)*

**Propósito:** Configuração explícita de comissão por profissional (complementa `professional_details.base_commission_percentage`).

| Coluna          | Tipo                    | Notas                                         |
|-----------------|-------------------------|-----------------------------------------------|
| `id`            | UUID PK                 |                                               |
| `tenant_id`     | UUID FK → tenants       | CASCADE DELETE                                |
| `user_id`       | UUID FK → users         | CASCADE DELETE (link para o profissional)     |
| `type`          | ENUM                    | `percentage | fixed | hybrid`; default `percentage` |
| `rate`          | DECIMAL(5,2)            | % quando `percentage` ou `hybrid`; default 30 |
| `fixed_amount`  | DECIMAL(10,2)           | Nullable — valor fixo por atendimento         |
| `notes`         | TEXT                    | Nullable                                      |
| `active`        | BOOLEAN                 | Default: true — `defaultScope` filtra ativos  |
| `deleted_at`    | TIMESTAMP               | Paranoid (soft delete)                        |

**Prioridade de taxa (CommissionsService):**
```
commission_settings.rate (se existir registro ativo)
  → professional.commission_rate
    → 30% (default)
```

**Índices:**
- `(tenant_id)`, `(tenant_id, user_id)`, `(user_id, active)`

---

## Padrões de Model adotados (Phase 6/7)

| Padrão               | Aplicado a                                             |
|----------------------|--------------------------------------------------------|
| `underscored: true`  | Todos os 5 models                                      |
| `timestamps: true`   | Todos os 5 models                                      |
| `paranoid: true`     | Apenas `CommissionSetting`                             |
| `defaultScope`       | `CommissionSetting` → `active: true`                   |
| `scopes nomeados`    | Todos — `.active`, `.enabled`, `.published`, `.byTenant` |
| FK com `references`  | Todas (tenant_id, user_id, created_by)                 |
| Associations em `models/index.js` | Centralizadas (não no `associate()` do model) |

---

## Fallbacks de Frontend

| Módulo             | Fallback                  | Condição                              |
|--------------------|---------------------------|---------------------------------------|
| `marketing.js`     | FALLBACK_CAMPAIGNS/METRICS| API retorna erro ou sem dados         |
| `ai-assistant.js`  | FALLBACK_INTERACTIONS     | Sem agendamentos ou API offline       |
| `team-commissions.js` | FALLBACK_PROFESSIONALS + demo revenue | API sem dados reais    |
| `help.js`          | FAQ/categorias estáticas  | API offline — conteúdo idêntico ao backend |

Os fallbacks são **intencionais** — garantem UX funcional em desenvolvimento local sem banco conectado.

---

*Criado: Fase 7 — Consolidação de persistência e contratos.*
