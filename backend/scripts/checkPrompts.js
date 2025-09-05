require('dotenv').config({ path: '../.env' });
const db = require('../models');

async function checkPrompts() {
  try {
    const prompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['orderIndex', 'ASC']]
    });
    
    console.log('Active prompts:');
    prompts.forEach(p => {
      console.log(`- Name: ${p.name}`);
      console.log(`  Category: ${p.category}`);
      console.log(`  Order: ${p.orderIndex}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPrompts();