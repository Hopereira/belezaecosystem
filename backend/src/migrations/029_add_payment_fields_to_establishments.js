'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('establishments');

    if (!table.payment_settings) {
      await queryInterface.addColumn('establishments', 'payment_settings', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }

    if (!table.bank_account) {
      await queryInterface.addColumn('establishments', 'bank_account', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }

    if (!table.pagarme_recipient_id) {
      await queryInterface.addColumn('establishments', 'pagarme_recipient_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('establishments');

    if (table.payment_settings) {
      await queryInterface.removeColumn('establishments', 'payment_settings');
    }

    if (table.bank_account) {
      await queryInterface.removeColumn('establishments', 'bank_account');
    }

    if (table.pagarme_recipient_id) {
      await queryInterface.removeColumn('establishments', 'pagarme_recipient_id');
    }
  },
};
