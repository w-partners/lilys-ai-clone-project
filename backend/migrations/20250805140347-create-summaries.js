'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('summaries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      originalContent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      summaryContent: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      keyPoints: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      sourceType: {
        type: Sequelize.ENUM('file', 'url', 'text'),
        allowNull: false
      },
      sourceUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fileId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      provider: {
        type: Sequelize.ENUM('openai', 'gemini'),
        allowNull: false
      },
      model: {
        type: Sequelize.STRING,
        allowNull: true
      },
      processingTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Processing time in milliseconds'
      },
      wordCount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      shareToken: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      sharedAt: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('summaries', ['userId']);
    await queryInterface.addIndex('summaries', ['status']);
    await queryInterface.addIndex('summaries', ['sourceType']);
    await queryInterface.addIndex('summaries', ['provider']);
    await queryInterface.addIndex('summaries', ['shareToken']);
    await queryInterface.addIndex('summaries', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('summaries');
  }
};