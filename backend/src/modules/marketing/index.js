/**
 * Marketing Module
 */

'use strict';

const MarketingService    = require('./marketing.service');
const MarketingController = require('./marketing.controller');
const createMarketingRoutes = require('./marketing.routes');

function initMarketingModule(sequelize, models) {
  const service    = new MarketingService(models);
  const controller = new MarketingController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createMarketingRoutes(controller, middleware),
  };
}

module.exports = { initMarketingModule };
