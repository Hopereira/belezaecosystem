/**
 * Mini-site Routes
 */

'use strict';

const { Router } = require('express');
const { validate, Joi } = require('../../shared/middleware/validation');

// slug: starts alphanumeric, may contain hyphens, 3–60 chars
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,59}$/;
// hex color: #RGB or #RRGGBB
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const updateConfigSchema = Joi.object({
  slug:                    Joi.string().min(3).max(60).lowercase().trim().pattern(SLUG_PATTERN)
                             .messages({ 'string.pattern.base': 'Slug deve ter 3–60 chars alfanuméricos e hífens.' }),
  title:                   Joi.string().min(1).max(255).allow(null, ''),
  description:             Joi.string().max(2000).allow(null, ''),
  hero_image_url:          Joi.string().uri({ scheme: ['http', 'https'] }).max(1000).allow(null, ''),
  cover_color:             Joi.string().pattern(HEX_COLOR_PATTERN).allow(null, '')
                             .messages({ 'string.pattern.base': 'cover_color deve ser uma cor hex válida (#RGB ou #RRGGBB).' }),
  contact_phone:           Joi.string().max(20).allow(null, ''),
  whatsapp:                Joi.string().max(20).allow(null, ''),
  address:                 Joi.string().max(500).allow(null, ''),
  booking_enabled:         Joi.boolean(),
  online_payment_enabled:  Joi.boolean(),
  reviews_enabled:         Joi.boolean(),
  services_highlight:      Joi.array().items(Joi.string().uuid()).max(20),
  professionals_highlight: Joi.array().items(Joi.string().uuid()).max(20),
}).min(1).messages({ 'object.min': 'Envie ao menos um campo para atualizar.' });

const publicSlugSchema = Joi.object({
  slug: Joi.string().min(3).max(60).lowercase().pattern(SLUG_PATTERN).required(),
});

function createMiniSiteRoutes(controller, middleware = {}) {
  const router    = Router();
  const publicRouter = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  // ── Authenticated tenant routes ──────────────────────────
  if (authenticate)   router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  // owner/admin manage site; professional cannot publish
  if (authorize)      router.use(authorize(['OWNER', 'ADMIN']));

  router.get('/',          controller.getConfig);
  router.patch('/',        validate(updateConfigSchema), controller.updateConfig);
  router.post('/publish',  controller.publish);
  router.post('/unpublish',controller.unpublish);

  // ── Public route (no auth) ───────────────────────────────
  publicRouter.get('/mini-site/:slug', validate(publicSlugSchema, 'params'), controller.getPublic);

  return { tenant: router, public: publicRouter };
}

module.exports = createMiniSiteRoutes;
