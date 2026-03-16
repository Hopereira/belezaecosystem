// PRODUCTION APP: Multi-Tenant SaaS Architecture
const { execSync } = require('child_process');
const app = require('./src/app.multitenant');
const { sequelize } = require('./src/models');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

async function runMigrations() {
  try {
    logger.info('Running pending database migrations...');
    execSync('npx sequelize-cli db:migrate --env production', {
      stdio: 'inherit',
      cwd: __dirname,
    });
    logger.info('Migrations completed.');
  } catch (err) {
    logger.error('Migration failed:', err.message);
    throw err;
  }
}

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Run migrations on startup (production) or sync models (development)
    if (env.nodeEnv === 'production') {
      await runMigrations();
    } else {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start server
    app.listen(env.port, '0.0.0.0', () => {
      logger.info(`Beauty Hub API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

start();
