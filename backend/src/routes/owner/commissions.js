/**
 * Commissions Routes Wrapper
 * Mounted under /professionals to keep REST coherence
 */

'use strict';

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initCommissionsModule } = require('../../modules/commissions');

const models = sequelize.models;
const commissionsModule = initCommissionsModule(sequelize, models);

const middleware = {
  tenantResolver: tenantFromJWT,
  authenticate,
  authorize: (roles) => authorize(...roles),
};

module.exports = commissionsModule.createRoutes(middleware);
