'use strict';

/**
 * Migration: Add tenant_id to legacy tables for multi-tenant isolation
 * 
 * Legacy tables (appointments, clients, services, professionals,
 * financial_entries, financial_exits, payment_methods) use establishment_id.
 * The refactored owner-* modules query by tenant_id.
 * This migration adds tenant_id to all affected tables.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Helper to check if column exists
      const columnExists = async (table, column) => {
        const [results] = await queryInterface.sequelize.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = '${table}' AND column_name = '${column}'
        `, { transaction });
        return results.length > 0;
      };

      // Tables that need tenant_id
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
        if (!(await columnExists(table, 'tenant_id'))) {
          await queryInterface.addColumn(table, 'tenant_id', {
            type: Sequelize.UUID,
            allowNull: true, // Nullable for backward compatibility with existing data
            references: { model: 'tenants', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }, { transaction });

          // Add index for tenant_id queries
          try {
            await queryInterface.addIndex(table, ['tenant_id'], {
              name: `${table}_tenant_id_idx`,
              transaction,
            });
          } catch (e) { /* ignore if exists */ }
        }
      }

      // Make establishment_id nullable on all legacy tables (transitioning to tenant_id)
      const tablesWithEstablishment = [
        'appointments', 'clients', 'services', 'professionals',
        'financial_entries', 'financial_exits',
      ];
      for (const table of tablesWithEstablishment) {
        try {
          await queryInterface.changeColumn(table, 'establishment_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'establishments', key: 'id' },
          }, { transaction });
        } catch (e) { /* ignore */ }
      }

      // For financial_entries: make payment_method_id nullable 
      // (owner-financial routes allow null but model says NOT NULL)
      try {
        await queryInterface.changeColumn('financial_entries', 'payment_method_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'payment_methods', key: 'id' },
        }, { transaction });
      } catch (e) { /* ignore if already nullable */ }

      await transaction.commit();

      console.log('✅ Migration 031: tenant_id added to legacy tables successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
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
        try {
          await queryInterface.removeIndex(table, `${table}_tenant_id_idx`, { transaction });
        } catch (e) { /* ignore */ }
        try {
          await queryInterface.removeColumn(table, 'tenant_id', { transaction });
        } catch (e) { /* ignore */ }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
