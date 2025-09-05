const db = require('../models');

async function addSystemPrompts() {
  try {
    // Find admin user
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668' }
    });
    
    if (!adminUser) {
      console.error('Admin user not found!');
      process.exit(1);
    }
    
    const prompts = [
      {
        name: '요약',
        prompt: `다음 YouTube 비디오 내용을 한국어로 요약해주세요. 
주요 주제와 핵심 메시지를 중심으로 구조화된 형식으로 작성해주세요.
* 로 시작하는 불릿 포인트 형식을 사용하세요.`,
        category: 'summary',
        order: 0,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '분석',
        prompt: `이 콘텐츠를 깊이 있게 분석해주세요:
1. 주요 논점과 주장
2. 근거와 예시
3. 강점과 약점
4. 시사점과 적용 방안`,
        category: 'analysis',
        order: 1,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '핵심 포인트',
        prompt: `이 콘텐츠의 핵심 포인트를 추출해주세요:
- 가장 중요한 5-7개의 핵심 사항
- 각 포인트는 한 문장으로 명확하게
- 실행 가능한 인사이트 포함`,
        category: 'keypoints',
        order: 2,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '실행 항목',
        prompt: `이 콘텐츠에서 실행 가능한 항목들을 추출해주세요:
- 즉시 실행 가능한 항목
- 단기 과제 (1주일 이내)
- 장기 과제 (1개월 이내)
- 각 항목에 대한 구체적인 실행 방법`,
        category: 'action_items',
        order: 3,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '감정 분석',
        prompt: `이 콘텐츠의 감정적 톤과 분위기를 분석해주세요:
- 전반적인 감정 톤
- 주요 감정 변화 포인트
- 화자의 태도와 입장
- 청중에게 전달하려는 감정적 메시지`,
        category: 'sentiment',
        order: 4,
        isActive: true,
        createdBy: adminUser.id
      }
    ];

    // Clear existing prompts
    await db.SystemPrompt.destroy({ where: {} });
    
    // Add new prompts
    for (const prompt of prompts) {
      await db.SystemPrompt.create(prompt);
      console.log(`Added prompt: ${prompt.name}`);
    }
    
    console.log('All system prompts added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding system prompts:', error);
    process.exit(1);
  }
}

addSystemPrompts();
