/**
 * AI Assistant Routes
 */

'use strict';

const { Router } = require('express');
const { validate, Joi } = require('../../shared/middleware/validation');

const INTERACTION_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING'];

const interactionsQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(50).default(10),
  status:    Joi.string().valid(...INTERACTION_STATUSES),
  startDate: Joi.date().iso().allow(null),
  endDate:   Joi.date().iso().allow(null),
  sortOrder: Joi.string().valid('ASC', 'DESC').uppercase().default('DESC'),
});

function createAiAssistantRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate)   router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  // owner/admin full access; professional read-only (same routes, no write ops)
  if (authorize)      router.use(authorize(['OWNER', 'ADMIN', 'PROFESSIONAL']));

  router.get('/status',       controller.getStatus);
  router.get('/interactions', validate(interactionsQuerySchema, 'query'), controller.getInteractions);
  router.get('/suggestions',  controller.getSuggestions);

  return router;
}

module.exports = createAiAssistantRoutes;
