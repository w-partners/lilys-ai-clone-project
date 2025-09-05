'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('files');
    
    // summaryId 컬럼이 없으면 추가
    if (!tableInfo.summaryId) {
      await queryInterface.addColumn('files', 'summaryId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'summaries',
          key: 'id'
        }
      });
    }
    
    // jobId 컬럼이 없으면 추가  
    if (!tableInfo.jobId) {
      await queryInterface.addColumn('files', 'jobId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'jobs',
          key: 'id'
        }
      });
    }

    // filename 컬럼이 없으면 추가 (fileName을 filename으로 변경)
    if (!tableInfo.filename && tableInfo.fileName) {
      await queryInterface.renameColumn('files', 'fileName', 'filename');
    }

    // path 컬럼이 없으면 추가 (storagePath를 path로 변경)
    if (!tableInfo.path && tableInfo.storagePath) {
      await queryInterface.renameColumn('files', 'storagePath', 'path');
    }

    // extractedText 컬럼이 없으면 추가
    if (!tableInfo.extractedText) {
      await queryInterface.addColumn('files', 'extractedText', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // isProcessed 컬럼이 없으면 추가
    if (!tableInfo.isProcessed) {
      await queryInterface.addColumn('files', 'isProcessed', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    // processingError 컬럼이 없으면 추가
    if (!tableInfo.processingError) {
      await queryInterface.addColumn('files', 'processingError', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // 인덱스 추가
    try {
      await queryInterface.addIndex('files', ['summaryId']);
      await queryInterface.addIndex('files', ['jobId']);
    } catch (error) {
      console.log('Indexes might already exist:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('files', 'summaryId');
    await queryInterface.removeColumn('files', 'jobId');
    await queryInterface.removeColumn('files', 'extractedText');
    await queryInterface.removeColumn('files', 'isProcessed');
    await queryInterface.removeColumn('files', 'processingError');
    
    await queryInterface.renameColumn('files', 'filename', 'fileName');
    await queryInterface.renameColumn('files', 'path', 'storagePath');
  }
};