/**
 * Mini-site Controller
 */

'use strict';

const { HTTP_STATUS } = require('../../shared/constants');

class MiniSiteController {
  constructor(service) {
    this.service = service;
    this.getConfig    = this.getConfig.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.publish      = this.publish.bind(this);
    this.unpublish    = this.unpublish.bind(this);
    this.getPublic    = this.getPublic.bind(this);
  }

  /** GET /mini-site */
  async getConfig(req, res, next) {
    try {
      const data = await this.service.getConfig(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** PATCH /mini-site */
  async updateConfig(req, res, next) {
    try {
      const data = await this.service.updateConfig(req.tenant.id, req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Configuração do mini-site atualizada.',
        data,
      });
    } catch (err) { next(err); }
  }

  /** POST /mini-site/publish */
  async publish(req, res, next) {
    try {
      const data = await this.service.publish(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Mini-site publicado com sucesso.',
        data,
      });
    } catch (err) { next(err); }
  }

  /** POST /mini-site/unpublish */
  async unpublish(req, res, next) {
    try {
      const data = await this.service.unpublish(req.tenant.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Mini-site despublicado.',
        data,
      });
    } catch (err) { next(err); }
  }

  /** GET /public/mini-site/:slug (no auth) */
  async getPublic(req, res, next) {
    try {
      const data = await this.service.getPublicConfig(req.params.slug);
      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Mini-site não encontrado ou não publicado.',
        });
      }
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = MiniSiteController;
