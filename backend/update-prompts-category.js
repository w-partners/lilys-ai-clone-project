const { Sequelize } = require('sequelize');
const config = require('./config/database.js')['development'];

// Initialize Sequelize
const sequelize = new Sequelize({
  ...config,
  logging: false
});

async function updatePromptsWithCategory() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Add category column if not exists
    try {
      await sequelize.query(`
        ALTER TABLE system_prompts ADD COLUMN category TEXT
      `);
      console.log('✅ Category column added');
    } catch (error) {
      console.log('ℹ️  Category column already exists');
    }

    // Update each prompt with category
    const categoryMapping = [
      { order_index: 0, category: 'summary' },
      { order_index: 1, category: 'analysis' },
      { order_index: 2, category: 'insights' },
      { order_index: 3, category: 'learning' },
      { order_index: 4, category: 'qa' },
      { order_index: 5, category: 'business' }
    ];

    for (const mapping of categoryMapping) {
      await sequelize.query(`
        UPDATE system_prompts 
        SET category = ? 
        WHERE order_index = ?
      `, {
        replacements: [mapping.category, mapping.order_index]
      });
    }

    console.log('✅ Categories updated successfully');
    
    // Check result
    const [results] = await sequelize.query(`
      SELECT id, name, category, order_index 
      FROM system_prompts 
      ORDER BY order_index
    `);
    
    console.log('📋 Updated system prompts:');
    results.forEach(prompt => {
      console.log(`- ${prompt.name} → ${prompt.category} (order: ${prompt.order_index})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

updatePromptsWithCategory();