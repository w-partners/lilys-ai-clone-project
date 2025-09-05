const db = require('../models');

async function setupCategories() {
  try {
    // Find admin user
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668' }
    });
    
    if (!adminUser) {
      console.error('Admin user not found!');
      process.exit(1);
    }
    
    const categories = [
      {
        name: '스크립트',
        prompt: '', // 사용자가 직접 입력
        category: 'script',
        order: 0,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '요약',
        prompt: '', // 사용자가 직접 입력
        category: 'summary',
        order: 1,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '실행포인트',
        prompt: '', // 사용자가 직접 입력
        category: 'action_points',
        order: 2,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '장면분석',
        prompt: '', // 사용자가 직접 입력
        category: 'scene_analysis',
        order: 3,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: 'Blog SEO',
        prompt: '', // 사용자가 직접 입력
        category: 'blog_seo',
        order: 4,
        isActive: true,
        createdBy: adminUser.id
      },
      {
        name: '사용자 정의',
        prompt: '', // 사용자가 직접 입력
        category: 'custom',
        order: 5,
        isActive: true,
        createdBy: adminUser.id
      }
    ];

    // Clear existing prompts
    await db.SystemPrompt.destroy({ where: {} });
    
    // Add new categories
    for (const category of categories) {
      await db.SystemPrompt.create(category);
      console.log(`Added category: ${category.name}`);
    }
    
    console.log('All system prompt categories created successfully!');
    console.log('User can now add prompts through the admin interface.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating categories:', error);
    process.exit(1);
  }
}

setupCategories();
