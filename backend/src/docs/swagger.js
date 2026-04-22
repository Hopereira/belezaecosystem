'use strict';

/**
 * OpenAPI 3.0 Specification — BelezaEcosystem API — Phase 8
 * Served at /api/docs (Swagger UI) and /api/docs/json (raw JSON)
 */

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'BelezaEcosystem API',
    version: '2.0.0',
    description: 'API multi-tenant SaaS para salões de beleza. Fase 8.',
    contact: { name: 'BelezaEcosystem', email: 'suporte@belezaecosystem.com' },
  },
  servers: [
    { url: '/api', description: 'API Base' },
  ],

  // ── Reusable Components ─────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via POST /api/auth/login',
      },
    },
    parameters: {
      TenantSlug: {
        name: 'X-Tenant-Slug',
        in: 'header',
        required: true,
        schema: { type: 'string', example: 'meu-salao' },
        description: 'Slug do tenant (salão). Obrigatório em todas as rotas autenticadas.',
      },
      PageParam:  { name: 'page',  in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      LimitParam: { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data:    { description: 'Payload da resposta' },
          message: { type: 'string', example: 'Operação realizada com sucesso.' },
          meta:    { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Erro de validação nos dados enviados.' },
          error: {
            type: 'object',
            properties: {
              code:    { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'array', items: { type: 'object', properties: {
                field:   { type: 'string' },
                message: { type: 'string' },
              }}},
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total:    { type: 'integer', example: 42 },
          page:     { type: 'integer', example: 1 },
          limit:    { type: 'integer', example: 20 },
          pages:    { type: 'integer', example: 3 },
          has_more: { type: 'boolean', example: true },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          name:             { type: 'string', example: 'Black Friday' },
          channel:          { type: 'string', enum: ['whatsapp', 'sms', 'email', 'push'] },
          status:           { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
          message_template: { type: 'string', nullable: true },
          audience_segment: { type: 'string', example: 'all' },
          sent_count:       { type: 'integer', example: 320 },
          conversion_count: { type: 'integer', example: 48 },
          conversion_rate:  { type: 'number', example: 15 },
          scheduled_at:     { type: 'string', format: 'date-time', nullable: true },
          sent_at:          { type: 'string', format: 'date-time', nullable: true },
          created_at:       { type: 'string', format: 'date-time' },
        },
      },
      MiniSiteConfig: {
        type: 'object',
        properties: {
          id:                     { type: 'string', format: 'uuid' },
          slug:                   { type: 'string', example: 'meu-salao' },
          title:                  { type: 'string', example: 'Salão da Ana' },
          description:            { type: 'string', nullable: true },
          cover_color:            { type: 'string', example: '#603322' },
          published:              { type: 'boolean' },
          booking_enabled:        { type: 'boolean' },
          online_payment_enabled: { type: 'boolean' },
          reviews_enabled:        { type: 'boolean' },
          contact_phone:          { type: 'string', nullable: true },
          address:                { type: 'string', nullable: true },
        },
      },
    },
    responses: {
      Unauthorized:    { description: 'Token ausente ou inválido',          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Forbidden:       { description: 'Permissão insuficiente',             content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound:        { description: 'Recurso não encontrado',             content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Dados inválidos',                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      TooManyRequests: { description: 'Rate limit excedido',                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      SubscriptionRequired: { description: 'Assinatura inativa ou expirada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },

  security: [{ bearerAuth: [] }],

  // ── Paths ───────────────────────────────────────────────────────────────────
  paths: {

    // ── AUTH ──────────────────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: {
            email:    { type: 'string', format: 'email', example: 'owner@salao.com' },
            password: { type: 'string', example: 'senhaSegura123' },
          }}}},
        },
        responses: {
          200: { description: 'Login realizado com sucesso', content: { 'application/json': { schema: { allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data: { type: 'object', properties: {
              access_token:  { type: 'string' },
              refresh_token: { type: 'string' },
              user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } },
            }}}},
          ]}}}},
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar access token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['refresh_token'], properties: {
            refresh_token: { type: 'string' },
          }}}},
        },
        responses: {
          200: { description: 'Token renovado', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Dados do usuário autenticado',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        responses: {
          200: { description: 'Dados do usuário', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── MARKETING ─────────────────────────────────────────────────────────────
    '/marketing/metrics': {
      get: {
        tags: ['Marketing'],
        summary: 'Métricas gerais de marketing',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        responses: {
          200: { description: 'Métricas', content: { 'application/json': { schema: { allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data: { type: 'object', properties: {
              campaigns_active:   { type: 'integer' },
              automations_active: { type: 'integer' },
              messages_sent:      { type: 'integer' },
              open_rate:          { type: 'number' },
              segmented_clients:  { type: 'integer' },
            }}}},
          ]}}}},
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/marketing/campaigns': {
      get: {
        tags: ['Marketing'],
        summary: 'Listar campanhas',
        parameters: [
          { $ref: '#/components/parameters/TenantSlug' },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'status',    in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] } },
          { name: 'channel',   in: 'query', schema: { type: 'string', enum: ['whatsapp', 'sms', 'email', 'push'] } },
          { name: 'search',    in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate',   in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sortBy',    in: 'query', schema: { type: 'string', enum: ['created_at', 'name', 'sent_count', 'status'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] } },
        ],
        responses: {
          200: { description: 'Lista de campanhas', content: { 'application/json': { schema: { allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } } } },
          ]}}}},
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Marketing'],
        summary: 'Criar campanha',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'channel'], properties: {
            name:             { type: 'string', maxLength: 255 },
            channel:          { type: 'string', enum: ['whatsapp', 'sms', 'email', 'push'] },
            message_template: { type: 'string' },
            audience_segment: { type: 'string', default: 'all' },
            scheduled_at:     { type: 'string', format: 'date-time' },
          }}}},
        },
        responses: {
          201: { description: 'Campanha criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // ── MINI-SITE ─────────────────────────────────────────────────────────────
    '/mini-site': {
      get: {
        tags: ['Mini-site'],
        summary: 'Buscar configuração do mini-site',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        responses: {
          200: { description: 'Config do mini-site', content: { 'application/json': { schema: { allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data: { $ref: '#/components/schemas/MiniSiteConfig' } } },
          ]}}}},
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      patch: {
        tags: ['Mini-site'],
        summary: 'Atualizar configuração do mini-site',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', minProperties: 1, properties: {
            slug:                   { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{2,59}$' },
            title:                  { type: 'string', maxLength: 255 },
            description:            { type: 'string', maxLength: 2000 },
            cover_color:            { type: 'string', pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$' },
            booking_enabled:        { type: 'boolean' },
            online_payment_enabled: { type: 'boolean' },
            reviews_enabled:        { type: 'boolean' },
          }}}},
        },
        responses: {
          200: { description: 'Config atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/mini-site/publish': {
      post: {
        tags: ['Mini-site'],
        summary: 'Publicar mini-site',
        parameters: [{ $ref: '#/components/parameters/TenantSlug' }],
        responses: {
          200: { description: 'Site publicado', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          400: { description: 'Title obrigatório para publicar', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/public/mini-site/{slug}': {
      get: {
        tags: ['Mini-site'],
        summary: 'Mini-site público (sem auth)',
        security: [],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{2,59}$' } }],
        responses: {
          200: { description: 'Dados públicos do mini-site' },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // ── HELP ──────────────────────────────────────────────────────────────────
    '/help/categories': {
      get: {
        tags: ['Help'],
        summary: 'Categorias de ajuda',
        security: [],
        responses: { 200: { description: 'Lista de categorias' } },
      },
    },

    '/help/faq': {
      get: {
        tags: ['Help'],
        summary: 'FAQ',
        security: [],
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
        responses: {
          200: { description: 'Perguntas frequentes' },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/help/contact': {
      post: {
        tags: ['Help'],
        summary: 'Enviar mensagem de contato',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'subject', 'message'], properties: {
            name:     { type: 'string', minLength: 2 },
            email:    { type: 'string', format: 'email' },
            subject:  { type: 'string', minLength: 5 },
            message:  { type: 'string', minLength: 20 },
            category: { type: 'string' },
          }}}},
        },
        responses: {
          201: { description: 'Mensagem enviada com sucesso' },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { description: 'Spam guard: muitas mensagens recentes', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ── COMMISSIONS ───────────────────────────────────────────────────────────
    '/professionals/commissions': {
      get: {
        tags: ['Commissions'],
        summary: 'Resumo de comissões de todos os profissionais',
        parameters: [
          { $ref: '#/components/parameters/TenantSlug' },
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'year'] } },
        ],
        responses: {
          200: { description: 'Resumo de comissões', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },

          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/professionals/{id}/commissions': {
      get: {
        tags: ['Commissions'],
        summary: 'Comissões de um profissional específico',
        parameters: [
          { $ref: '#/components/parameters/TenantSlug' },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'year'] } },
        ],
        responses: {
          200: { description: 'Comissões do profissional' },
          404: { $ref: '#/components/responses/NotFound' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── AI ASSISTANT ──────────────────────────────────────────────────────────
    '/ai/interactions': {
      get: {
        tags: ['AI Assistant'],
        summary: 'Listar interações do assistente IA',
        parameters: [
          { $ref: '#/components/parameters/TenantSlug' },
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'status',    in: 'query', schema: { type: 'string', enum: ['pending', 'resolved', 'escalated'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] } },
        ],
        responses: {
          200: { description: 'Lista de interações', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: { $ref: '#/components/responses/SubscriptionRequired' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // ── HEALTH ────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check da API',
        security: [],
        responses: { 200: { description: 'API operacional' } },
      },
    },
  },
};

module.exports = swaggerDefinition;
