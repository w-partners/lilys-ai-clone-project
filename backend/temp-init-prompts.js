const { Sequelize } = require('sequelize');
const config = require('./config/database.js')['development'];

// Initialize Sequelize
const sequelize = new Sequelize({
  ...config,
  logging: false
});

async function initPrompts() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create simple prompts directly with SQL
    const prompts = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: '핵심 요약',
        prompt_text: 'YouTube 동영상의 핵심 내용을 간결하게 요약해주세요.',
        order_index: 0,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: '상세 분석',
        prompt_text: 'YouTube 동영상을 자세히 분석하여 주요 포인트를 설명해주세요.',
        order_index: 1,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: '실행 가능한 인사이트',
        prompt_text: 'YouTube 동영상에서 실행 가능한 인사이트와 아이디어를 추출해주세요.',
        order_index: 2,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: '학습 포인트',
        prompt_text: 'YouTube 동영상에서 배울 수 있는 학습 포인트와 교훈을 정리해주세요.',
        order_index: 3,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Q&A 생성',
        prompt_text: 'YouTube 동영상 내용을 바탕으로 Q&A 형태의 학습 자료를 만들어주세요.',
        order_index: 4,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: '비즈니스 적용',
        prompt_text: 'YouTube 동영상의 내용을 비즈니스나 실무에 어떻게 적용할 수 있는지 설명해주세요.',
        order_index: 5,
        is_active: 1,
        created_by: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // First create a user if not exists
    await sequelize.query(`
      INSERT OR IGNORE INTO users (id, phone, password, name, role, isActive, emailVerified, preferences, createdAt, updatedAt) 
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        '01034424668',
        '$2a$10$5Bv2wU/sI7zmcdvwK9r.jevwO89lj.Zu9LhcOr6Jcf/sQe2a09fay',
        '관리자',
        'admin',
        1,
        1,
        '{"language":"ko","theme":"light","notifications":true}',
        '${new Date().toISOString()}',
        '${new Date().toISOString()}'
      )
    `);

    // Insert prompts
    for (const prompt of prompts) {
      await sequelize.query(`
        INSERT OR REPLACE INTO system_prompts (id, name, prompt_text, order_index, is_active, created_by, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          prompt.id,
          prompt.name,
          prompt.prompt_text,
          prompt.order_index,
          prompt.is_active,
          prompt.created_by,
          prompt.createdAt,
          prompt.updatedAt
        ]
      });
    }

    console.log('✅ Prompts initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize prompts:', error);
  } finally {
    await sequelize.close();
  }
}

initPrompts();