/**
 * Help Routes
 */

'use strict';

const { Router } = require('express');
const { validate, Joi } = require('../../shared/middleware/validation');

const VALID_CATEGORIES = ['start', 'appts', 'clients', 'finance', 'billing', 'team', 'marketing', 'account'];

const contactSchema = Joi.object({
  name:     Joi.string().min(2).max(150).trim().required()
              .messages({ 'string.min': 'Nome deve ter ao menos 2 caracteres.' }),
  email:    Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  subject:  Joi.string().min(5).max(255).trim().required()
              .messages({ 'string.min': 'Assunto deve ter ao menos 5 caracteres.' }),
  category: Joi.string().valid(...VALID_CATEGORIES, 'other').allow(null, ''),
  message:  Joi.string().min(20).max(5000).trim().required()
              .messages({ 'string.min': 'Mensagem deve ter ao menos 20 caracteres.' }),
});

const faqQuerySchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES),
});

function createHelpRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, tenantResolver } = middleware;

  // GET endpoints are public (categories + faq visible before login)
  router.get('/categories', controller.getCategories);
  router.get('/faq',        validate(faqQuerySchema, 'query'), controller.getFaq);

  // Contact requires authentication (captures user context)
  router.post(
    '/contact',
    ...(authenticate ? [authenticate] : []),
    ...(tenantResolver ? [tenantResolver] : []),
    validate(contactSchema),
    controller.submitContact
  );

  return router;
}

module.exports = createHelpRoutes;
