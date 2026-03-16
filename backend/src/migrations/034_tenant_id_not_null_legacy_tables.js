'use strict';

/**
 * Migration: Make tenant_id NOT NULL in legacy tables
 * Run AFTER 033_backfill_tenant_id_legacy_tables.js
 * Ensures strict multi-tenant isolation on all tables
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = [
        'appointments',
        'clients',
        'services',
        'professionals',
        'financial_entries',
        'financial_exits',
        'payment_methods',
      ];

      for (const table of tables) {
        // Remove any remaining NULL rows as safeguard (orphaned records)
        await queryInterface.sequelize.query(
          `DELETE FROM ${table} WHERE tenant_id IS NULL`,
          { transaction }
        );

        // Apply NOT NULL constraint
        await queryInterface.changeColumn(
          table,
          'tenant_id',
          {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'tenants', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log('✅ Migration 034: tenant_id is now NOT NULL on all legacy tables');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = [
        'appointments', 'clients', 'services', 'professionals',
        'financial_entries', 'financial_exits', 'payment_methods',
      ];

      for (const table of tables) {
        await queryInterface.changeColumn(
          table,
          'tenant_id',
          { type: Sequelize.UUID, allowNull: true },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
