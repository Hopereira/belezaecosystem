/**
 * Help Module
 */

'use strict';

const HelpService    = require('./help.service');
const HelpController = require('./help.controller');
const createHelpRoutes = require('./help.routes');

function initHelpModule(sequelize, models) {
  const service    = new HelpService(models);
  const controller = new HelpController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createHelpRoutes(controller, middleware),
  };
}

module.exports = { initHelpModule };
