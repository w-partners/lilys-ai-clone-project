const db = require('../models');
const { Op } = require('sequelize');

async function fixProcessingJobs() {
  try {
    console.log('Checking for stuck processing jobs...');
    
    // Find all jobs that are stuck in processing state
    const stuckJobs = await db.Job.findAll({
      where: {
        status: 'processing',
        updatedAt: {
          [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) // Older than 5 minutes
        }
      },
      include: [{
        model: db.Summary,
        as: 'summary'
      }]
    });

    if (stuckJobs.length === 0) {
      console.log('No stuck jobs found');
      return;
    }

    console.log(`Found ${stuckJobs.length} stuck jobs. Fixing...`);

    for (const job of stuckJobs) {
      // Check if summary exists and has content
      if (job.summary && job.summary.summaryContent) {
        // Job completed but status wasn't updated
        await job.update({
          status: 'completed',
          progress: 100,
          completedAt: job.summary.createdAt
        });
        console.log(`Fixed job ${job.id} - marked as completed`);
      } else {
        // Job failed
        await job.update({
          status: 'failed',
          progress: 0,
          error: 'Job timed out or failed to complete'
        });
        console.log(`Fixed job ${job.id} - marked as failed`);
      }
    }

    console.log('All stuck jobs have been fixed');
    
    // Also check for summaries without proper originalContent
    const summariesWithoutContent = await db.Summary.findAll({
      where: {
        originalContent: null,
        sourceType: 'youtube'
      }
    });

    console.log(`Found ${summariesWithoutContent.length} summaries without transcripts`);

  } catch (error) {
    console.error('Error fixing processing jobs:', error);
  } finally {
    await db.sequelize.close();
  }
}

fixProcessingJobs();