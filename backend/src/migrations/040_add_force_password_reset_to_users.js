'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'force_password_reset', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'When true, user must change password on next login (e.g. professionals created by owner)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'force_password_reset');
  },
};
