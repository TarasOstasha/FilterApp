'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('filter_fields', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('filter_fields', 'sort_order');
  }
};
