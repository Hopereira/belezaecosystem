'use strict';

/**
 * Phase 7 — Incremental consolidation migration
 *
 * 1. Add missing indexes to existing Phase 6 tables
 * 2. Create commission_settings table (per-professional rate + type)
 *
 * Safe: all addIndex calls use `{ ifNotExists: true }` / try-catch
 * Safe: createTable is idempotent via IF NOT EXISTS
 */
module.exports = {
  async up(queryInterface, Sequelize) {

    // ── 1. marketing_campaigns ─────────────────────────────
    // Add composite index for date-range queries
    await _safeAddIndex(queryInterface, 'marketing_campaigns', ['tenant_id', 'created_at'], {
      name: 'idx_mktg_campaigns_tenant_createdat',
    });
    // Add index for channel (filter)
    await _safeAddIndex(queryInterface, 'marketing_campaigns', ['tenant_id', 'channel'], {
      name: 'idx_mktg_campaigns_tenant_channel',
    });
    // Add index for scheduled_at (upcoming/scheduled queries)
    await _safeAddIndex(queryInterface, 'marketing_campaigns', ['scheduled_at'], {
      name: 'idx_mktg_campaigns_scheduled_at',
    });

    // ── 2. marketing_automations ───────────────────────────
    // enabled index (list active automations efficiently)
    await _safeAddIndex(queryInterface, 'marketing_automations', ['tenant_id', 'enabled'], {
      name: 'idx_mktg_automations_tenant_enabled',
    });

    // ── 3. mini_site_configs ───────────────────────────────
    // published filter (public endpoint)
    await _safeAddIndex(queryInterface, 'mini_site_configs', ['published'], {
      name: 'idx_mini_site_configs_published',
    });
    // published + slug composite (public lookup)
    await _safeAddIndex(queryInterface, 'mini_site_configs', ['slug', 'published'], {
      name: 'idx_mini_site_configs_slug_published',
    });

    // ── 4. help_contact_requests ───────────────────────────
    // created_at for ordering / date range
    await _safeAddIndex(queryInterface, 'help_contact_requests', ['created_at'], {
      name: 'idx_help_contact_requests_createdat',
    });
    // email for duplicate/spam check
    await _safeAddIndex(queryInterface, 'help_contact_requests', ['email', 'created_at'], {
      name: 'idx_help_contact_requests_email_createdat',
    });

    // ── 5. commission_settings ─────────────────────────────
    // Lightweight per-professional commission configuration.
    // Supplements professional_details.base_commission_percentage with type + overrides.
    await queryInterface.createTable('commission_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Links to professional (via users table, same pattern as professional_details)
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Commission model: percentage | fixed | hybrid
      type: {
        type: Sequelize.ENUM('percentage', 'fixed', 'hybrid'),
        allowNull: false,
        defaultValue: 'percentage',
      },
      // Percentage rate (0.00–100.00) — used when type = percentage or hybrid
      rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 30.00,
      },
      // Fixed amount per appointment — used when type = fixed or hybrid
      fixed_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      },
      // Optional notes/description
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Whether this setting is the current active one
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // Soft delete + timestamps
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('commission_settings', ['tenant_id'], {
      name: 'idx_commission_settings_tenant',
    });
    await queryInterface.addIndex('commission_settings', ['tenant_id', 'user_id'], {
      name: 'idx_commission_settings_tenant_user',
    });
    await queryInterface.addIndex('commission_settings', ['user_id', 'active'], {
      name: 'idx_commission_settings_user_active',
    });
  },

  async down(queryInterface) {
    // Remove commission_settings table
    await queryInterface.dropTable('commission_settings');

    // Remove added indexes (best effort — dropIndex ignores if missing)
    const toRemove = [
      ['marketing_campaigns',      'idx_mktg_campaigns_tenant_createdat'],
      ['marketing_campaigns',      'idx_mktg_campaigns_tenant_channel'],
      ['marketing_campaigns',      'idx_mktg_campaigns_scheduled_at'],
      ['marketing_automations',    'idx_mktg_automations_tenant_enabled'],
      ['mini_site_configs',        'idx_mini_site_configs_published'],
      ['mini_site_configs',        'idx_mini_site_configs_slug_published'],
      ['help_contact_requests',    'idx_help_contact_requests_createdat'],
      ['help_contact_requests',    'idx_help_contact_requests_email_createdat'],
    ];
    for (const [table, name] of toRemove) {
      try { await queryInterface.removeIndex(table, name); } catch (_) {}
    }
  },
};

// Helper: addIndex with safe fallback if already exists
async function _safeAddIndex(queryInterface, table, fields, options = {}) {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (err) {
    // Postgres: duplicate_table / duplicate_object — safe to ignore
    if (!/already exists|duplicate/i.test(err.message)) throw err;
  }
}
