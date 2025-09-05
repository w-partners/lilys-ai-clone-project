'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // summaries 테이블에 jobId 컬럼 추가
    const tableInfo = await queryInterface.describeTable('summaries');
    
    if (!tableInfo.jobId) {
      await queryInterface.addColumn('summaries', 'jobId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'jobs',
          key: 'id'
        }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('summaries', 'jobId');
  }
};