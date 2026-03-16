'use strict';

const LgpdService = require('./lgpd.service');
const LgpdController = require('./lgpd.controller');
const { createLgpdRoutes } = require('./lgpd.routes');

function initLgpdModule({ models, sequelize, middleware }) {
  const service = new LgpdService(models, sequelize);
  const controller = new LgpdController(service);
  const routes = createLgpdRoutes(middleware, controller);

  return { service, controller, routes };
}

module.exports = { initLgpdModule };
