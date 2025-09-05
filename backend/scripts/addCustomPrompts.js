const db = require('../models');
const logger = require('../utils/logger');

async function addCustomPrompts() {
  try {
    // Get admin user
    const adminUser = await db.User.findOne({
      where: { phone: '01034424668' }
    });

    if (!adminUser) {
      logger.warn('Admin user not found, skipping prompt initialization');
      return;
    }

    const customPrompts = [
      {
        name: '타임스탬프 스크립트',
        prompt: 'Generate a timestamped transcript of the video in korean. Each line must follow this format precisely: [hh:mm:ss] Dialogue. Return only the timestamp and spoken content; omit any other text or formatting. If the spoken language is not Korean, translate the transcription into natural Korean.',
        category: 'transcript',
        order: 1
      },
      {
        name: '구조화된 요약',
        prompt: 'Provide a concise summary of the main points in nested bullets, using quotes only when absolutely essential for clarity in Korean. * Summarize in a structured hierarchical format. * Start output directly with the response. * Omit responses like "OK," "Sure," or "Here is your request," and begin directly with the requested content.',
        category: 'summary',
        order: 2
      }
    ];

    let createdCount = 0;
    let updatedCount = 0;
    
    for (const promptData of customPrompts) {
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
      } else {
        // Update existing prompt
        await prompt.update({
          prompt: promptData.prompt,
          category: promptData.category,
          order: promptData.order,
          isActive: true
        });
        updatedCount++;
        logger.info(`Updated prompt: ${prompt.name}`);
      }
    }

    logger.info(`Created ${createdCount} new prompts, updated ${updatedCount} existing prompts`);
    return { created: createdCount, updated: updatedCount };
  } catch (error) {
    logger.error('Error adding custom prompts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addCustomPrompts()
    .then((result) => {
      console.log(`Successfully created ${result.created} prompts and updated ${result.updated} prompts`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to add custom prompts:', error);
      process.exit(1);
    });
}

module.exports = addCustomPrompts;