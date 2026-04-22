/**
 * Commissions Controller
 */

'use strict';

const { HTTP_STATUS } = require('../../shared/constants');

class CommissionsController {
  constructor(service) {
    this.service = service;
    this.getSummary      = this.getSummary.bind(this);
    this.getByProfessional = this.getByProfessional.bind(this);
    this.getPerformance  = this.getPerformance.bind(this);
  }

  /** GET /professionals/commissions */
  async getSummary(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getSummary(req.tenant.id, { period });
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /professionals/:id/commissions */
  async getByProfessional(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getProfessionalCommissions(
        req.tenant.id,
        req.params.id,
        { period }
      );
      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Profissional não encontrado.',
        });
      }
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /professionals/performance */
  async getPerformance(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getPerformance(req.tenant.id, { period });
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = CommissionsController;
