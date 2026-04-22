'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('appointments');

    if (!tableDesc.cancel_token) {
      await queryInterface.addColumn('appointments', 'cancel_token', {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'One-time token for public cancellation without login',
      });
    }

    if (!tableDesc.cancel_token_used) {
      await queryInterface.addColumn('appointments', 'cancel_token_used', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!tableDesc.booking_source) {
      await queryInterface.addColumn('appointments', 'booking_source', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'internal',
        comment: '"public" = via booking page, "internal" = via dashboard',
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('appointments');
    if (tableDesc.cancel_token)      await queryInterface.removeColumn('appointments', 'cancel_token');
    if (tableDesc.cancel_token_used) await queryInterface.removeColumn('appointments', 'cancel_token_used');
    if (tableDesc.booking_source)    await queryInterface.removeColumn('appointments', 'booking_source');
  },
};
