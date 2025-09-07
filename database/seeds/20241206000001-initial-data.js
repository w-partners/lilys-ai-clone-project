'use strict';

const bcrypt = require('../../backend/node_modules/bcryptjs');
const { v4: uuidv4 } = require('../../backend/node_modules/uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminId = uuidv4();
    const operatorId = uuidv4();

    // Create admin and operator users
    await queryInterface.bulkInsert('Users', [
      {
        id: adminId,
        phoneNumber: '01034424668',
        passwordHash: await bcrypt.hash('admin1234', 10),
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: operatorId,
        phoneNumber: '01012345678',
        passwordHash: await bcrypt.hash('admin1234', 10),
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create default system prompts
    await queryInterface.bulkInsert('SystemPrompts', [
      {
        id: uuidv4(),
        name: '핵심 요약',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 핵심 내용을 요약해주세요:

1. 주요 주제와 핵심 메시지를 간결하게 정리
2. 중요한 포인트들을 불릿 형태로 정리
3. 영상의 전체적인 결론이나 메시지 제시

요약은 원본 내용의 20% 분량으로 작성하되, 핵심 정보는 누락되지 않도록 해주세요.`,
        isActive: true,
        orderIndex: 1,
        category: 'summary',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '학습 가이드',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 학습자를 위한 가이드를 작성해주세요:

1. 학습 목표: 이 영상을 통해 무엇을 배울 수 있는지
2. 주요 개념: 핵심 개념들을 정의와 함께 설명
3. 실습 방법: 실제로 적용할 수 있는 방법이나 예시
4. 추가 학습: 더 깊이 공부하기 위한 방향성 제시

학습자가 체계적으로 이해할 수 있도록 구조화해주세요.`,
        isActive: true,
        orderIndex: 2,
        category: 'analysis',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '퀴즈 생성',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 이해도 확인 퀴즈를 만들어주세요:

1. 객관식 문제 5개 (4지선다, 정답 표시)
2. 주관식 문제 3개 (핵심 개념 설명)
3. 실습 문제 2개 (실제 적용 상황)

각 문제는 영상의 핵심 내용을 잘 이해했는지 확인할 수 있는 수준으로 작성해주세요.
정답과 해설도 함께 제공해주세요.`,
        isActive: true,
        orderIndex: 3,
        category: 'quiz',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '키워드 분석',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 키워드 분석을 해주세요:

1. 핵심 키워드 TOP 10 (빈도순)
2. 주제별 카테고리 분류
3. 관련 용어 및 개념 정리
4. 검색 최적화 키워드 제안

각 키워드의 중요도와 영상 내에서의 맥락을 함께 설명해주세요.`,
        isActive: true,
        orderIndex: 4,
        category: 'analysis',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '영어 번역',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 영어 번역본을 만들어주세요:

1. 자연스러운 영어 번역 제공
2. 전문 용어는 원문과 번역을 함께 표기
3. 문화적 맥락이 필요한 부분은 설명 추가
4. 핵심 메시지가 잘 전달되도록 의역

번역의 정확성과 자연스러움을 모두 고려해주세요.`,
        isActive: true,
        orderIndex: 5,
        category: 'translation',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '액션 플랜',
        prompt: `다음 YouTube 영상의 자막을 바탕으로 실행 가능한 액션 플랜을 작성해주세요:

1. 단기 목표 (1주일 내 실행 가능한 행동들)
2. 중기 목표 (1개월 내 달성할 목표들)
3. 장기 목표 (3개월 이상의 장기적 계획)
4. 체크리스트 (실행 여부를 확인할 수 있는 항목들)

구체적이고 측정 가능한 행동 계획으로 작성해주세요.`,
        isActive: true,
        orderIndex: 6,
        category: 'custom',
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SystemPrompts', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};