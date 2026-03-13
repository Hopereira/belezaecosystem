/**
 * Database Connection
 * Centralized Sequelize instance with connection pooling
 */

const { Sequelize } = require('sequelize');
const env = require('../../config/env');
const logger = require('../utils/logger');

const isProduction = env.nodeEnv === 'production';
const useSSL = env.db.ssl || isProduction;

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: isProduction ? false : (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true,
  },
  pool: {
    max: isProduction ? parseInt(process.env.DB_POOL_MAX || '10', 10) : 20,
    min: isProduction ? 1 : 5,
    acquire: 60000,
    idle: 10000,
  },
  dialectOptions: useSSL ? {
    ssl: { require: true, rejectUnauthorized: false },
  } : {},
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  closeConnection,
};
