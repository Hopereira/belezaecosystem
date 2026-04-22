/**
 * Marketing Controller
 * HTTP layer — thin, delegates to service
 */

'use strict';

const { HTTP_STATUS } = require('../../shared/constants');

class MarketingController {
  constructor(service) {
    this.service = service;
    this.getMetrics         = this.getMetrics.bind(this);
    this.getCampaigns       = this.getCampaigns.bind(this);
    this.createCampaign     = this.createCampaign.bind(this);
    this.updateCampaign     = this.updateCampaign.bind(this);
    this.getAutomations     = this.getAutomations.bind(this);
    this.toggleAutomation   = this.toggleAutomation.bind(this);
  }

  /** GET /marketing/metrics */
  async getMetrics(req, res, next) {
    try {
      const data = await this.service.getMetrics(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /marketing/campaigns */
  async getCampaigns(req, res, next) {
    try {
      const { page, limit, status, channel, search, startDate, endDate, sortBy, sortOrder } = req.query;
      const result = await this.service.getCampaigns(req.tenant.id, {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        status, channel, search, startDate, endDate, sortBy, sortOrder,
      });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data:    result.data,
        meta:    result.meta,
      });
    } catch (err) { next(err); }
  }

  /** POST /marketing/campaigns */
  async createCampaign(req, res, next) {
    try {
      const campaign = await this.service.createCampaign(
        req.tenant.id,
        req.user.id,
        req.body
      );
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Campanha criada com sucesso.',
        data: campaign,
      });
    } catch (err) { next(err); }
  }

  /** PATCH /marketing/campaigns/:id */
  async updateCampaign(req, res, next) {
    try {
      const campaign = await this.service.updateCampaign(
        req.tenant.id,
        req.params.id,
        req.body
      );
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Campanha atualizada.',
        data: campaign,
      });
    } catch (err) { next(err); }
  }

  /** GET /marketing/automations */
  async getAutomations(req, res, next) {
    try {
      const data = await this.service.getAutomations(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** PATCH /marketing/automations/:id/toggle */
  async toggleAutomation(req, res, next) {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "Campo 'enabled' (boolean) é obrigatório.",
        });
      }
      const automation = await this.service.toggleAutomation(
        req.tenant.id,
        req.params.id,
        enabled
      );
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Automação ${enabled ? 'ativada' : 'desativada'}.`,
        data: automation,
      });
    } catch (err) { next(err); }
  }
}

module.exports = MarketingController;
