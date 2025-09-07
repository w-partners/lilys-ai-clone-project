'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Summaries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      jobId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Jobs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      systemPromptId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'SystemPrompts',
          key: 'id'
        }
      },
      aiProvider: {
        type: Sequelize.ENUM('gemini', 'openai'),
        defaultValue: 'gemini',
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tokensUsed: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      processingTime: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
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

    await queryInterface.addIndex('Summaries', ['jobId']);
    await queryInterface.addIndex('Summaries', ['systemPromptId']);
    await queryInterface.addIndex('Summaries', ['aiProvider']);
    await queryInterface.addIndex('Summaries', ['status']);
    await queryInterface.addIndex('Summaries', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Summaries');
  }
};