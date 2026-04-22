/**
 * Mini-site Routes Wrapper
 */

'use strict';

const { sequelize } = require('../../models');
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { initMiniSiteModule } = require('../../modules/mini-site');

const models = sequelize.models;
const miniSiteModule = initMiniSiteModule(sequelize, models);

const middleware = {
  tenantResolver: tenantFromJWT,
  authenticate,
  authorize: (roles) => authorize(...roles),
};

const routes = miniSiteModule.createRoutes(middleware);

module.exports = routes;
