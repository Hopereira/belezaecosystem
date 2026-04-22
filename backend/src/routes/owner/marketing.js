/**
 * Marketing Routes Wrapper
 */

'use strict';

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initMarketingModule } = require('../../modules/marketing');

const models = sequelize.models;
const marketingModule = initMarketingModule(sequelize, models);

const middleware = {
  tenantResolver: tenantFromJWT,
  authenticate,
  authorize: (roles) => authorize(...roles),
};

module.exports = marketingModule.createRoutes(middleware);
