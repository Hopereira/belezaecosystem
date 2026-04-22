/**
 * Marketing Routes
 */

'use strict';

const { Router } = require('express');
const { validate, Joi } = require('../../shared/middleware/validation');

const createCampaignSchema = Joi.object({
  name:             Joi.string().max(255).required(),
  channel:          Joi.string().valid('whatsapp', 'sms', 'email', 'push').required(),
  message_template: Joi.string().max(2000).allow(null, ''),
  audience_segment: Joi.string().max(50).default('all'),
  scheduled_at:     Joi.date().iso().allow(null),
});

const updateCampaignSchema = Joi.object({
  name:             Joi.string().max(255),
  channel:          Joi.string().valid('whatsapp', 'sms', 'email', 'push'),
  status:           Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled'),
  message_template: Joi.string().max(2000).allow(null, ''),
  audience_segment: Joi.string().max(50),
  scheduled_at:     Joi.date().iso().allow(null),
});

const toggleAutomationSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

const CHANNELS  = ['whatsapp', 'sms', 'email', 'push'];
const STATUSES  = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const SORT_COLS = ['created_at', 'name', 'sent_count', 'conversion_count', 'scheduled_at', 'status'];

const listQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
  status:    Joi.string().valid(...STATUSES),
  channel:   Joi.string().valid(...CHANNELS),
  search:    Joi.string().max(100).allow('', null),
  startDate: Joi.date().iso().allow(null),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).allow(null),
  sortBy:    Joi.string().valid(...SORT_COLS).default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').uppercase().default('DESC'),
});

function createMarketingRoutes(controller, middleware = {}) {
  const router = Router();
  const { authenticate, authorize, tenantResolver } = middleware;

  if (authenticate)   router.use(authenticate);
  if (tenantResolver) router.use(tenantResolver);
  // owner/admin only — professional cannot manage marketing
  if (authorize)      router.use(authorize(['OWNER', 'ADMIN']));

  router.get('/metrics',    controller.getMetrics);
  router.get('/campaigns',  validate(listQuerySchema, 'query'), controller.getCampaigns);
  router.post('/campaigns', validate(createCampaignSchema),     controller.createCampaign);
  router.patch('/campaigns/:id', validate(updateCampaignSchema), controller.updateCampaign);
  router.get('/automations',     controller.getAutomations);
  router.patch('/automations/:id/toggle', validate(toggleAutomationSchema), controller.toggleAutomation);

  return router;
}

module.exports = createMarketingRoutes;
