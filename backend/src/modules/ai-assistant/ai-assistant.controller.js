/**
 * AI Assistant Controller
 */

'use strict';

const { HTTP_STATUS } = require('../../shared/constants');

class AiAssistantController {
  constructor(service) {
    this.service = service;
    this.getStatus       = this.getStatus.bind(this);
    this.getInteractions = this.getInteractions.bind(this);
    this.getSuggestions  = this.getSuggestions.bind(this);
  }

  /** GET /ai/status */
  async getStatus(req, res, next) {
    try {
      const data = await this.service.getStatus(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /ai/interactions */
  async getInteractions(req, res, next) {
    try {
      const { page, limit, status, startDate, endDate, sortOrder } = req.query;
      const result = await this.service.getInteractions(req.tenant.id, {
        page:      parseInt(page,  10) || 1,
        limit:     parseInt(limit, 10) || 10,
        status, startDate, endDate, sortOrder,
      });
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data:    result.data,
        meta:    result.meta,
      });
    } catch (err) { next(err); }
  }

  /** GET /ai/suggestions */
  async getSuggestions(req, res, next) {
    try {
      const data = await this.service.getSuggestions(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = AiAssistantController;
