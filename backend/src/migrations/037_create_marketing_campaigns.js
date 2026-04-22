'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marketing_campaigns', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('whatsapp', 'sms', 'email', 'push'),
        allowNull: false,
        defaultValue: 'whatsapp',
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      message_template: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      audience_segment: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'all',
      },
      audience_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      sent_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      conversion_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('marketing_campaigns', ['tenant_id']);
    await queryInterface.addIndex('marketing_campaigns', ['tenant_id', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_campaigns');
  },
};
