'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_usage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ai_provider: {
        type: Sequelize.ENUM('gemini', 'openai'),
        allowNull: false
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cost: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0,
        comment: 'Cost in USD'
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'API endpoint used'
      },
      request_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
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
    
    await queryInterface.addIndex('api_usage', ['user_id', 'createdAt']);
    await queryInterface.addIndex('api_usage', ['ai_provider']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_usage');
  }
};
