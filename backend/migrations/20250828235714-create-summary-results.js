'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('summary_results', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      summary_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'summaries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      system_prompt_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'system_prompts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      result_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      processing_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Processing time in milliseconds'
      },
      ai_provider: {
        type: Sequelize.ENUM('gemini', 'openai'),
        allowNull: false
      },
      model_used: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    
    await queryInterface.addIndex('summary_results', ['summary_id']);
    await queryInterface.addIndex('summary_results', ['system_prompt_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('summary_results');
  }
};
