/**
 * Help Controller
 */

'use strict';

const { HTTP_STATUS } = require('../../shared/constants');

class HelpController {
  constructor(service) {
    this.service = service;
    this.getCategories = this.getCategories.bind(this);
    this.getFaq        = this.getFaq.bind(this);
    this.submitContact = this.submitContact.bind(this);
  }

  /** GET /help/categories */
  async getCategories(req, res, next) {
    try {
      const data = this.service.getCategories();
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /help/faq */
  async getFaq(req, res, next) {
    try {
      const data = this.service.getFaq({ category: req.query.category });
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /help/contact */
  async submitContact(req, res, next) {
    try {
      const tenantId = req.tenant?.id || null;
      const userId   = req.user?.id   || null;
      const result   = await this.service.submitContact(tenantId, userId, req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Mensagem enviada com sucesso. Nossa equipe entrará em contato em breve.',
        data: result,
      });
    } catch (err) { next(err); }
  }
}

module.exports = HelpController;
