/**
 * Commissions Module
 */

'use strict';

const CommissionsService    = require('./commissions.service');
const CommissionsController = require('./commissions.controller');
const createCommissionsRoutes = require('./commissions.routes');

function initCommissionsModule(sequelize, models) {
  const service    = new CommissionsService(models);
  const controller = new CommissionsController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createCommissionsRoutes(controller, middleware),
  };
}

module.exports = { initCommissionsModule };
