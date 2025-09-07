'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SystemPrompts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      prompt: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      orderIndex: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      category: {
        type: Sequelize.STRING(50),
        defaultValue: 'general'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('SystemPrompts', ['isActive']);
    await queryInterface.addIndex('SystemPrompts', ['orderIndex']);
    await queryInterface.addIndex('SystemPrompts', ['category']);
    await queryInterface.addIndex('SystemPrompts', ['createdBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SystemPrompts');
  }
};