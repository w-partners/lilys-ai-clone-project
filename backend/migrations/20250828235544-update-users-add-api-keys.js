'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // API 키 필드 추가
    await queryInterface.addColumn('users', 'gemini_api_key', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'openai_api_key', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // name 필드를 nullable로 변경
    await queryInterface.changeColumn('users', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'gemini_api_key');
    await queryInterface.removeColumn('users', 'openai_api_key');
    
    await queryInterface.changeColumn('users', 'name', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
