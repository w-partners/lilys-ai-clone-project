'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('files', {
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
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      storageProvider: {
        type: Sequelize.ENUM('local', 'gcs', 's3'),
        defaultValue: 'local'
      },
      storagePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      storageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      uploadedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      deletedAt: {
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
    await queryInterface.addIndex('files', ['userId']);
    await queryInterface.addIndex('files', ['fileName']);
    await queryInterface.addIndex('files', ['mimeType']);
    await queryInterface.addIndex('files', ['isDeleted']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('files');
  }
};