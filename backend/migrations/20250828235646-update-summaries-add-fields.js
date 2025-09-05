'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // userId를 nullable로 변경
    await queryInterface.changeColumn('summaries', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // SQLite는 ENUM을 지원하지 않으므로 TEXT 타입 사용
    // input_type 컬럼 추가
    await queryInterface.addColumn('summaries', 'input_type', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: 'text'
    });
    
    // 기존 데이터 마이그레이션
    await queryInterface.sequelize.query(`
      UPDATE summaries 
      SET input_type = CASE 
        WHEN sourceType = 'file' THEN 'pdf'
        WHEN sourceType = 'url' THEN 'url'
        WHEN sourceType = 'text' THEN 'text'
        ELSE 'text'
      END;
    `);
    
    // sourceType 컬럼 삭제 - SQLite는 ALTER TABLE DROP COLUMN을 지원하지 않으므로 생략
    // await queryInterface.removeColumn('summaries', 'sourceType');

    // input_content 필드 추가
    await queryInterface.addColumn('summaries', 'input_content', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: ''
    });

    // email 필드 추가 (비로그인 사용자용)
    await queryInterface.addColumn('summaries', 'email', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('summaries', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.removeColumn('summaries', 'email');
    await queryInterface.removeColumn('summaries', 'input_content');
    
    await queryInterface.changeColumn('summaries', 'input_type', {
      type: Sequelize.ENUM('file', 'url', 'text'),
      allowNull: false
    });
    await queryInterface.renameColumn('summaries', 'input_type', 'sourceType');
  }
};
