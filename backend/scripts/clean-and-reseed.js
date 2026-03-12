/**
 * Clean all data and re-run seeds
 * Run inside container: node scripts/clean-and-reseed.js
 */
const { sequelize } = require('../src/models');

async function cleanAndReseed() {
  try {
    console.log('Cleaning all data with TRUNCATE CASCADE...');

    const tables = [
      'financial_entries', 'financial_exits', 'appointments',
      'payment_methods', 'clients', 'services', 'professionals',
      'subscriptions', 'notifications', 'tenants', 'establishments', 'users',
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(`  Truncated: ${table}`);
      } catch (e) {
        console.log(`  Skip ${table}: ${e.message}`);
      }
    }

    // Clear seed tracking
    for (const meta of ['SequelizeSeedMeta', 'SequelizeData']) {
      try { await sequelize.query(`DELETE FROM "${meta}"`); } catch(e) {}
    }

    console.log('All data cleaned successfully.');
  } catch (error) {
    console.error('Clean error:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

cleanAndReseed();
