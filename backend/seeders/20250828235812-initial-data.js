'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 관리자 계정 생성
    const adminId = uuidv4();
    const operatorId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin1234', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        id: adminId,
        phone: '01034424668',
        password: hashedPassword,
        name: '관리자',
        email: 'admin@youtube.platformmakers.org',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        preferences: JSON.stringify({
          language: 'ko',
          theme: 'light',
          notifications: true
        }),
        gemini_api_key: 'AIzaSyBhXb6o6nxY2Neo38qZzUsC7ReQPic1kRY',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: operatorId,
        phone: '01012345678',
        password: hashedPassword,
        name: '운영자',
        email: 'operator@youtube.platformmakers.org',
        role: 'operator',
        isActive: true,
        emailVerified: true,
        preferences: JSON.stringify({
          language: 'ko',
          theme: 'light',
          notifications: true
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 기본 시스템 프롬프트 생성
    const systemPrompts = [
      {
        id: uuidv4(),
        name: '핵심 요약',
        prompt_text: '다음 콘텐츠를 한국어로 핵심만 간단히 요약해주세요. 중요한 포인트를 bullet point로 정리하고, 전체적인 내용을 2-3문장으로 요약해주세요.',
        order_index: 1,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '상세 분석',
        prompt_text: '다음 콘텐츠를 한국어로 상세하게 분석해주세요. 주요 주제, 논점, 근거, 결론을 체계적으로 정리하고, 내용의 강점과 약점을 평가해주세요.',
        order_index: 2,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '실행 가능한 인사이트',
        prompt_text: '다음 콘텐츠에서 실제로 적용 가능한 인사이트와 행동 지침을 한국어로 추출해주세요. 구체적인 실행 방법과 예상 효과를 함께 제시해주세요.',
        order_index: 3,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '학습 포인트',
        prompt_text: '다음 콘텐츠에서 학습할 수 있는 핵심 개념과 원리를 한국어로 정리해주세요. 초보자도 이해할 수 있도록 쉽게 설명하고, 관련 예시를 들어주세요.',
        order_index: 4,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Q&A 생성',
        prompt_text: '다음 콘텐츠를 바탕으로 중요한 질문 5개와 각 질문에 대한 답변을 한국어로 생성해주세요. 콘텐츠의 핵심을 이해하는데 도움이 되는 질문들로 구성해주세요.',
        order_index: 5,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '비즈니스 적용',
        prompt_text: '다음 콘텐츠를 비즈니스 관점에서 분석하고, 한국어로 비즈니스에 적용할 수 있는 전략과 방법을 제시해주세요. ROI, 리스크, 기회 요인을 포함해주세요.',
        order_index: 6,
        is_active: true,
        created_by: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('system_prompts', systemPrompts);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('system_prompts', null, {});
    await queryInterface.bulkDelete('users', {
      phone: ['01034424668', '01012345678']
    }, {});
  }
};
