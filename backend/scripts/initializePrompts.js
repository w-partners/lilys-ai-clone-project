const db = require('../models');
const logger = require('../utils/logger');

async function initializePrompts() {
  try {
    // Get admin user
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668' }
    });

    if (!adminUser) {
      logger.warn('Admin user not found, skipping prompt initialization');
      return;
    }

    const defaultPrompts = [
      {
        name: '핵심 요약',
        prompt: '다음 콘텐츠를 한국어로 핵심 내용만 간단명료하게 요약해주세요. 중요한 정보와 주요 논점을 중심으로 3-5개의 문단으로 정리해주세요.',
        category: 'summary',
        order: 1
      },
      {
        name: '상세 분석',
        prompt: '다음 콘텐츠를 한국어로 심층 분석해주세요. 주제, 논점, 근거, 결론을 체계적으로 정리하고, 내용의 강점과 약점을 평가해주세요.',
        category: 'analysis',
        order: 2
      },
      {
        name: '핵심 포인트',
        prompt: '다음 콘텐츠에서 가장 중요한 핵심 포인트를 한국어로 번호를 매겨 리스트 형태로 정리해주세요. 각 포인트는 한 문장으로 명확하게 표현해주세요.',
        category: 'keypoints',
        order: 3
      },
      {
        name: '실행 항목',
        prompt: '다음 콘텐츠를 바탕으로 실행 가능한 구체적인 행동 항목들을 한국어로 도출해주세요. 우선순위와 함께 실천 가능한 단계별 계획을 제시해주세요.',
        category: 'action_items',
        order: 4
      },
      {
        name: '감정 분석',
        prompt: '다음 콘텐츠의 감정적 톤과 분위기를 한국어로 분석해주세요. 긍정적/부정적/중립적 요소를 파악하고, 전달하고자 하는 감정적 메시지를 해석해주세요.',
        category: 'sentiment',
        order: 5
      },
      {
        name: '학습 포인트',
        prompt: '다음 콘텐츠에서 배울 수 있는 주요 학습 포인트를 한국어로 정리해주세요. 각 포인트에 대해 왜 중요한지, 어떻게 활용할 수 있는지 설명해주세요.',
        category: 'custom',
        order: 6
      }
    ];

    let createdCount = 0;
    for (const promptData of defaultPrompts) {
      const [prompt, created] = await db.SystemPrompt.findOrCreate({
        where: { name: promptData.name },
        defaults: {
          ...promptData,
          createdBy: adminUser.id,
          isActive: true
        }
      });
      
      if (created) {
        createdCount++;
        logger.info(`Created prompt: ${prompt.name}`);
      }
    }

    logger.info(`Initialized ${createdCount} default prompts`);
    return createdCount;
  } catch (error) {
    logger.error('Error initializing prompts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializePrompts()
    .then((count) => {
      console.log(`Successfully initialized ${count} prompts`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize prompts:', error);
      process.exit(1);
    });
}

module.exports = initializePrompts;