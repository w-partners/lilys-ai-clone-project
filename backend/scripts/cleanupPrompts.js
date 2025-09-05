require('dotenv').config({ path: '../.env' });
const db = require('../models');

async function cleanupPrompts() {
  try {
    // 사용자가 원하는 2개의 프롬프트만 남기기
    const wantedPrompts = [
      {
        name: '타임스탬프 스크립트',
        prompt: `유튜브 비디오 스크립트를 타임스탬프와 함께 다음 형식으로 정리해주세요:

[타임스탬프] 내용

예시:
[00:00] 인트로
[00:30] 주제 소개
[01:15] 핵심 내용 설명

비디오의 전체 내용을 시간 순서대로 정리하되, 중요한 부분은 더 자세히 설명해주세요.`,
        category: 'transcript',
        order: 1
      },
      {
        name: '구조화된 요약',
        prompt: `다음 비디오 내용을 구조화된 형식으로 요약해주세요:

## 📌 핵심 요약
(3-5줄로 전체 내용 요약)

## 🎯 주요 포인트
• 포인트 1
• 포인트 2
• 포인트 3

## 💡 핵심 통찰
(가장 중요한 메시지나 교훈)

## 🔍 상세 내용
(주요 주제별로 자세한 설명)

## 📝 결론
(최종 정리 및 시사점)`,
        category: 'summary',
        order: 2
      }
    ];

    // 모든 프롬프트 삭제
    await db.SystemPrompt.destroy({
      where: {},
      truncate: true
    });
    console.log('✅ 모든 기존 프롬프트를 삭제했습니다.');

    // admin 사용자 찾기
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668' }
    });

    if (!adminUser) {
      console.error('❌ Admin 사용자를 찾을 수 없습니다.');
      process.exit(1);
    }

    // 원하는 프롬프트만 생성
    for (const promptData of wantedPrompts) {
      await db.SystemPrompt.create({
        ...promptData,
        createdBy: adminUser.id,
        isActive: true
      });
      console.log(`✅ 생성됨: ${promptData.name} (${promptData.category})`);
    }

    // 최종 확인
    const finalPrompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      attributes: ['name', 'category', 'orderIndex'],
      order: [['orderIndex', 'ASC']]
    });

    console.log('\n📋 최종 프롬프트 목록:');
    finalPrompts.forEach(p => {
      console.log(`- ${p.name} (${p.category}, 순서: ${p.orderIndex})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupPrompts();