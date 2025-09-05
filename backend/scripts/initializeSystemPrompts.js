const db = require('../models');
const logger = require('../utils/logger');

const defaultPrompts = [
  {
    name: '핵심 요약',
    category: 'summary',
    orderIndex: 1,
    promptText: `다음 YouTube 동영상의 자막을 바탕으로 핵심 내용을 요약해주세요.

요구사항:
- 주요 내용을 3-5개의 핵심 포인트로 정리
- 각 포인트는 2-3문장으로 구성
- 전체적인 맥락과 흐름을 유지
- 불필요한 반복이나 잡담은 제외

포맷:
## 핵심 요약

1. **[주제1]**: 설명
2. **[주제2]**: 설명
3. **[주제3]**: 설명

자막 내용:`
  },
  {
    name: '상세 분석',
    category: 'analysis',
    orderIndex: 2,
    promptText: `다음 YouTube 동영상의 자막을 심층적으로 분석해주세요.

분석 항목:
- 주제별 세부 내용 분석
- 논리적 구조와 전개 방식
- 제시된 예시나 사례 분석
- 화자의 의도와 메시지
- 중요한 데이터나 수치 정보

포맷:
## 상세 분석

### 주제별 세부 분석
[내용]

### 논리적 구조
[내용]

### 핵심 예시/사례
[내용]

### 중요 데이터/수치
[내용]

자막 내용:`
  },
  {
    name: '실행 가능한 인사이트',
    category: 'action_points',
    orderIndex: 3,
    promptText: `다음 YouTube 동영상의 자막을 바탕으로 실행 가능한 인사이트와 액션 아이템을 제시해주세요.

요구사항:
- 구체적이고 실행 가능한 행동 방안
- 단계별 실행 계획
- 예상 결과와 효과
- 주의사항이나 고려사항

포맷:
## 실행 가능한 인사이트

### 즉시 실행 가능한 액션
1. [액션]: [구체적인 방법]
2. [액션]: [구체적인 방법]

### 중장기 실행 계획
1. [계획]: [단계별 방법]
2. [계획]: [단계별 방법]

### 주의사항
- [고려사항]

자막 내용:`
  },
  {
    name: '학습 포인트',
    category: 'learning',
    orderIndex: 4,
    promptText: `다음 YouTube 동영상의 자막을 바탕으로 학습자를 위한 핵심 학습 포인트를 정리해주세요.

요구사항:
- 핵심 개념과 정의
- 중요한 원리나 법칙
- 기억해야 할 키워드
- 심화 학습을 위한 참고사항

포맷:
## 학습 포인트

### 핵심 개념
- **[개념]**: 설명

### 중요 원리/법칙
- **[원리]**: 설명

### 키워드 정리
- [키워드]: 의미

### 심화 학습 가이드
- [추천 학습 방향]

자막 내용:`
  },
  {
    name: 'Q&A 생성',
    category: 'qa',
    orderIndex: 5,
    promptText: `다음 YouTube 동영상의 자막을 바탕으로 이해도 점검을 위한 Q&A를 생성해주세요.

요구사항:
- 내용 이해도를 확인할 수 있는 질문
- 명확하고 구체적인 답변
- 다양한 난이도의 질문 (기본/심화)
- 실제 적용 가능한 시나리오 질문

포맷:
## Q&A

### 기본 이해 확인
**Q1:** [질문]
**A1:** [답변]

**Q2:** [질문]
**A2:** [답변]

### 심화 질문
**Q3:** [질문]
**A3:** [답변]

### 적용/시나리오 질문
**Q4:** [질문]
**A4:** [답변]

자막 내용:`
  },
  {
    name: '비즈니스 적용',
    category: 'business',
    orderIndex: 6,
    promptText: `다음 YouTube 동영상의 자막을 바탕으로 비즈니스 관점에서의 적용 방안을 제시해주세요.

요구사항:
- 비즈니스 기회와 아이디어
- 수익 모델이나 활용 방안
- 시장 동향과 전략적 함의
- 경쟁 우위 확보 방안

포맷:
## 비즈니스 적용

### 비즈니스 기회
- [기회]: 설명

### 수익 모델/활용 방안
- [방안]: 구체적인 방법

### 시장 동향 분석
- [트렌드]: 분석 내용

### 전략적 제안
- [전략]: 실행 계획

자막 내용:`
  }
];

async function initializeSystemPrompts() {
  try {
    console.log('Starting system prompts initialization...');
    
    // 관리자 계정 확인
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668', role: 'admin' }
    });

    if (!adminUser) {
      console.error('Admin user not found. Please run accounts:init first.');
      process.exit(1);
    }

    console.log('Admin user found:', adminUser.name);

    // 기존 시스템 프롬프트 확인
    const existingPrompts = await db.SystemPrompt.findAll();
    
    if (existingPrompts.length > 0) {
      console.log(`Found ${existingPrompts.length} existing system prompts`);
      
      // 활성화된 프롬프트가 6개 미만이면 추가 생성
      const activePrompts = existingPrompts.filter(p => p.isActive);
      if (activePrompts.length >= 6) {
        console.log('Required system prompts already exist.');
        process.exit(0);
      }
    }

    // 기본 시스템 프롬프트 생성
    console.log('Creating default system prompts...');
    
    for (const promptData of defaultPrompts) {
      // 중복 확인
      const existing = await db.SystemPrompt.findOne({
        where: { 
          name: promptData.name,
          category: promptData.category 
        }
      });

      if (existing) {
        console.log(`System prompt "${promptData.name}" already exists, skipping...`);
        continue;
      }

      const prompt = await db.SystemPrompt.create({
        ...promptData,
        createdBy: adminUser.id,
        isActive: true
      });

      console.log(`✓ Created system prompt: ${prompt.name}`);
    }

    console.log('System prompts initialization completed successfully!');

    // 결과 확인
    const finalPrompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['orderIndex', 'ASC']]
    });

    console.log('\nActive system prompts:');
    finalPrompts.forEach((prompt, index) => {
      console.log(`${index + 1}. ${prompt.name} (${prompt.category})`);
    });

  } catch (error) {
    console.error('Error initializing system prompts:', error);
    logger.error('System prompts initialization failed:', error);
    process.exit(1);
  } finally {
    // 데이터베이스 연결 종료
    if (db.sequelize) {
      await db.sequelize.close();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  initializeSystemPrompts();
}

module.exports = initializeSystemPrompts;