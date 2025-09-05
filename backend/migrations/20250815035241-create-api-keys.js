'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isIn: [['gemini', 'openai']]
        }
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Optional name/label for the key'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      errorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastErrorAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add indexes
    await queryInterface.addIndex('api_keys', ['provider', 'isActive']);
    await queryInterface.addIndex('api_keys', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_keys');
  }
};