'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SourceContents', {
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
      contentType: {
        type: Sequelize.ENUM('subtitle', 'transcript', 'description'),
        defaultValue: 'subtitle',
        allowNull: false
      },
      rawContent: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'ko'
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      wordCount: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex('SourceContents', ['jobId']);
    await queryInterface.addIndex('SourceContents', ['contentType']);
    await queryInterface.addIndex('SourceContents', ['language']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SourceContents');
  }
};