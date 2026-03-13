/**
 * Fix: Make establishment_id nullable on legacy tables
 * Run once to fix migration 031 constraint issue
 */
const env = require('../src/config/env');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  dialectOptions: env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  logging: false,
});

async function run() {
  const tables = [
    'professionals', 'services', 'clients',
    'appointments', 'financial_entries', 'financial_exits',
  ];

  for (const table of tables) {
    try {
      await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN establishment_id DROP NOT NULL`);
      console.log(`OK: ${table}.establishment_id is now nullable`);
    } catch (e) {
      console.log(`SKIP: ${table} - ${e.message}`);
    }
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
