'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    // Check if solo plan already exists
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM subscription_plans WHERE slug = 'solo' LIMIT 1`
    );
    if (existing.length > 0) return;

    const id = uuidv4();
    const limits = JSON.stringify({ users: 1, professionals: 1, clients: 200, appointments_per_month: 300, storage_mb: 200 });
    const metadata = JSON.stringify({ tenant_type: 'autonomous', highlight: 'Para autônomos' });

    await queryInterface.sequelize.query(`
      INSERT INTO subscription_plans
        (id, name, slug, description, price, currency, billing_interval, trial_days,
         limits, features, is_active, is_public, sort_order, metadata, created_at, updated_at)
      VALUES
        (:id, 'Solo', 'solo',
         'Para profissionais autônomos. Gerencie sua agenda, clientes e finanças sem complicação.',
         29.90, 'BRL', 'monthly', 14,
         :limits::jsonb,
         ARRAY['appointments','clients','financial','notifications','mini_site'],
         true, true, 0,
         :metadata::jsonb,
         NOW(), NOW())
    `, {
      replacements: { id, limits, metadata },
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM subscription_plans WHERE slug = 'solo'`
    );
  },
};
