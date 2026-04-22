'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mini_site_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // One row per tenant (unique constraint enforced below)
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      hero_image_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cover_color: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '#603322',
      },
      contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      booking_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      online_payment_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reviews_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // JSON arrays of IDs for highlighted services/professionals
      services_highlight: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      professionals_highlight: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      published_at: {
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

    await queryInterface.addIndex('mini_site_configs', ['tenant_id']);
    await queryInterface.addIndex('mini_site_configs', ['slug']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mini_site_configs');
  },
};
