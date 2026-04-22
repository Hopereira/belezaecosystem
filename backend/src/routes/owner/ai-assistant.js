/**
 * AI Assistant Routes Wrapper
 */

'use strict';

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initAiAssistantModule } = require('../../modules/ai-assistant');

const models = sequelize.models;
const aiModule = initAiAssistantModule(sequelize, models);

const middleware = {
  tenantResolver: tenantFromJWT,
  authenticate,
  authorize: (roles) => authorize(...roles),
};

module.exports = aiModule.createRoutes(middleware);
