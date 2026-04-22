/**
 * AI Assistant Module
 */

'use strict';

const AiAssistantService    = require('./ai-assistant.service');
const AiAssistantController = require('./ai-assistant.controller');
const createAiAssistantRoutes = require('./ai-assistant.routes');

function initAiAssistantModule(sequelize, models) {
  const service    = new AiAssistantService(models);
  const controller = new AiAssistantController(service);

  return {
    service,
    controller,
    createRoutes: (middleware) => createAiAssistantRoutes(controller, middleware),
  };
}

module.exports = { initAiAssistantModule };
