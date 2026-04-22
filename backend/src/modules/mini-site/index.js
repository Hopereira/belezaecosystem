/**
 * Mini-site Module
 */

'use strict';

const MiniSiteService    = require('./mini-site.service');
const MiniSiteController = require('./mini-site.controller');
const createMiniSiteRoutes = require('./mini-site.routes');

function initMiniSiteModule(sequelize, models) {
  const service    = new MiniSiteService(models);
  const controller = new MiniSiteController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createMiniSiteRoutes(controller, middleware),
  };
}

module.exports = { initMiniSiteModule };
