'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marketing_automations', {
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
      // Slug identifier so frontend can reference stable IDs (e.g. 'confirm', 'reminder')
      slug: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      trigger_type: {
        type: Sequelize.ENUM(
          'appointment_confirmed',
          'appointment_reminder_24h',
          'client_inactive_30d',
          'client_inactive_60d',
          'client_birthday',
          'appointment_completed'
        ),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('whatsapp', 'sms', 'email', 'push'),
        allowNull: false,
        defaultValue: 'whatsapp',
      },
      message_template: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      executions_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_executed_at: {
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

    await queryInterface.addIndex('marketing_automations', ['tenant_id']);
    await queryInterface.addIndex('marketing_automations', ['tenant_id', 'slug'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_automations');
  },
};
