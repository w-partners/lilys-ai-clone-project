// Script to fix stuck job statuses in the database
const db = require('../models');

async function fixJobStatuses() {
  try {
    console.log('Fixing stuck job statuses...');
    
    // Find all jobs that are stuck in 'processing' status but have related summaries
    const stuckJobs = await db.Job.findAll({
      where: { status: 'processing' },
      include: [{
        model: db.Summary,
        as: 'summary'
      }]
    });
    
    console.log(`Found ${stuckJobs.length} stuck jobs`);
    
    for (const job of stuckJobs) {
      // If a job has a related summary, it should be completed
      if (job.summary) {
        await job.update({
          status: 'completed',
          progress: 100,
          completedAt: job.summary.createdAt
        });
        console.log(`Fixed job ${job.id} - marked as completed`);
      } else {
        // If no summary and job is older than 1 hour, mark as failed
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (job.createdAt < oneHourAgo) {
          await job.update({
            status: 'failed',
            error: 'Job timed out',
            completedAt: new Date()
          });
          console.log(`Fixed job ${job.id} - marked as failed (timeout)`);
        }
      }
    }
    
    // Also find summaries without jobs and set them as completed
    const summariesWithoutJobs = await db.Summary.findAll({
      where: { jobId: null }
    });
    
    console.log(`Found ${summariesWithoutJobs.length} summaries without jobs`);
    
    // For summaries that have content, they are completed
    for (const summary of summariesWithoutJobs) {
      if (summary.summaryContent) {
        console.log(`Summary ${summary.id} has content but no job - already complete`);
      }
    }
    
    console.log('Job status fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing job statuses:', error);
    process.exit(1);
  }
}

fixJobStatuses();