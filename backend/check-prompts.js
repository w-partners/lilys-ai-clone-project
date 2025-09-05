const { Sequelize } = require('sequelize');
const config = require('./config/database.js')['development'];

// Initialize Sequelize
const sequelize = new Sequelize({
  ...config,
  logging: false
});

async function checkPrompts() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check current system prompts
    const [results] = await sequelize.query(`
      SELECT id, name, prompt_text, order_index 
      FROM system_prompts 
      ORDER BY order_index
    `);
    
    console.log('📋 Current system prompts:');
    results.forEach(prompt => {
      console.log(`- ${prompt.name} (order: ${prompt.order_index})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkPrompts();