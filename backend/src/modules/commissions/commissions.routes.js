/**
 * Commissions Routes
 * Mounted under /professionals to keep REST resource coherence
 */

'use strict';

const { Router } = require('express');
const { validate, Joi } = require('../../shared/middleware/validation');

const periodQuerySchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'year').default('month'),
});

function createCommissionsRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate)   router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  if (authorize)      router.use(authorize(['OWNER', 'ADMIN']));

  // GET /professionals/commissions
  router.get('/commissions',       validate(periodQuerySchema, 'query'), controller.getSummary);
  // GET /professionals/performance
  router.get('/performance',       validate(periodQuerySchema, 'query'), controller.getPerformance);
  // GET /professionals/:id/commissions
  router.get('/:id/commissions',   validate(periodQuerySchema, 'query'), controller.getByProfessional);

  return router;
}

module.exports = createCommissionsRoutes;
