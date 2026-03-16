'use strict';

const { asyncHandler } = require('../../shared/middleware');

class LgpdController {
  constructor(lgpdService) {
    this.service = lgpdService;
  }

  exportMyData() {
    return asyncHandler(async (req, res) => {
      const data = await this.service.exportUserData(req.tenantId, req.user.id);
      res.setHeader('Content-Disposition', `attachment; filename="dados_pessoais_${req.user.id}.json"`);
      res.json({ success: true, data });
    });
  }

  requestDeletion() {
    return asyncHandler(async (req, res) => {
      const { reason } = req.body;
      const result = await this.service.requestDataDeletion(req.tenantId, req.user.id, reason);
      res.status(202).json({
        success: true,
        message: 'Solicitação de exclusão registrada. Será processada em até 15 dias conforme Art. 18 VI da LGPD.',
        data: result,
      });
    });
  }

  listRequests() {
    return asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, status } = req.query;
      const result = await this.service.listDeletionRequests({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        status,
      });
      res.json({ success: true, ...result });
    });
  }

  processRequest() {
    return asyncHandler(async (req, res) => {
      const result = await this.service.processDeletionRequest(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    });
  }
}

module.exports = LgpdController;
