'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make userId nullable in jobs table
    await queryInterface.changeColumn('jobs', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Make userId nullable in summaries table
    await queryInterface.changeColumn('summaries', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert userId to not nullable in jobs table
    await queryInterface.changeColumn('jobs', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Revert userId to not nullable in summaries table
    await queryInterface.changeColumn('summaries', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  }
};