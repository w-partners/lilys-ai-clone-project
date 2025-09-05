require('dotenv').config({ path: '../.env' });
const db = require('../models');

async function deactivateUnneededPrompts() {
  try {
    // 남겨둘 프롬프트 (사용자가 요청한 2개)
    const keepPrompts = [
      '타임스탬프 스크립트', // transcript 카테고리
      '구조화된 요약' // summary 카테고리
    ];

    // 모든 프롬프트를 비활성화
    await db.SystemPrompt.update(
      { isActive: false },
      { where: {} }
    );

    // 필요한 프롬프트만 활성화
    const result = await db.SystemPrompt.update(
      { isActive: true },
      { 
        where: { 
          name: keepPrompts 
        }
      }
    );

    console.log(`✅ ${result[0]}개의 프롬프트를 활성화했습니다.`);

    // 활성화된 프롬프트 확인
    const activePrompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      attributes: ['name', 'category', 'order']
    });

    console.log('\n활성 프롬프트:');
    activePrompts.forEach(prompt => {
      console.log(`- ${prompt.name} (${prompt.category})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deactivateUnneededPrompts();