require('dotenv').config({ path: '../.env' });
const db = require('../models');

async function deleteUnneededPrompts() {
  try {
    // 남겨둘 프롬프트 (사용자가 요청한 2개)
    const keepPrompts = [
      '타임스탬프 스크립트', // transcript 카테고리
      '구조화된 요약' // summary 카테고리
    ];

    // 남겨둘 프롬프트의 ID 찾기
    const keepPromptsData = await db.SystemPrompt.findAll({
      where: { 
        name: keepPrompts 
      },
      attributes: ['id', 'name']
    });

    const keepIds = keepPromptsData.map(p => p.id);
    console.log('남겨둘 프롬프트:');
    keepPromptsData.forEach(p => console.log(`- ${p.name}`));

    // 나머지 프롬프트 삭제
    const deleteResult = await db.SystemPrompt.destroy({
      where: {
        id: {
          [db.Sequelize.Op.notIn]: keepIds
        }
      }
    });

    console.log(`\n✅ ${deleteResult}개의 프롬프트를 삭제했습니다.`);

    // 남은 프롬프트 확인
    const remainingPrompts = await db.SystemPrompt.findAll({
      attributes: ['name', 'category', 'orderIndex'],
      order: [['orderIndex', 'ASC']]
    });

    console.log('\n남은 프롬프트:');
    remainingPrompts.forEach(prompt => {
      console.log(`- ${prompt.name} (${prompt.category}, 순서: ${prompt.orderIndex})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteUnneededPrompts();