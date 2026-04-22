/**
 * Help Routes Wrapper (semi-public — categories/FAQ without auth)
 */

'use strict';

const { sequelize } = require('../models');
const { authenticate } = require('../middleware/auth');
const tenantFromJWT = require('../middleware/tenantFromJWT');
const { initHelpModule } = require('../modules/help');

const models = sequelize.models;
const helpModule = initHelpModule(sequelize, models);

const middleware = {
  tenantResolver: tenantFromJWT,
  authenticate,
};

module.exports = helpModule.createRoutes(middleware);
