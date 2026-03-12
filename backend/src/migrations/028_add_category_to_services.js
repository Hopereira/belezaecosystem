'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('services');
    if (!table.category) {
      await queryInterface.addColumn('services', 'category', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'name',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('services');
    if (table.category) {
      await queryInterface.removeColumn('services', 'category');
    }
  },
};
