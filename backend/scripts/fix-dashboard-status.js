const db = require('../models');

(async () => {
  try {
    // Get all summaries with their jobs
    const summaries = await db.Summary.findAll({
      include: [{
        model: db.Job,
        as: 'job'
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('Found', summaries.length, 'summaries');
    
    for (const summary of summaries) {
      // If summary has content but job is still processing, fix it
      if (summary.summaryContent && summary.job && summary.job.status !== 'completed') {
        console.log('Fixing summary', summary.id, '- has content but job status is', summary.job.status);
        await summary.job.update({
          status: 'completed',
          progress: 100,
          completedAt: summary.job.completedAt || new Date()
        });
      }
      // If summary has no content and job is old, mark as failed
      else if (!summary.summaryContent && summary.job) {
        const jobAge = Date.now() - new Date(summary.job.createdAt).getTime();
        if (jobAge > 60000 && summary.job.status === 'processing') { // Older than 1 minute
          console.log('Marking old job as failed for summary', summary.id);
          await summary.job.update({
            status: 'failed',
            progress: 0,
            error: 'Processing timeout'
          });
        }
      }
    }
    
    // Show current status
    const updatedSummaries = await db.Summary.findAll({
      include: [{
        model: db.Job,
        as: 'job'
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('\nCurrent status of recent summaries:');
    updatedSummaries.forEach(s => {
      console.log({
        id: s.id,
        title: s.title?.substring(0, 30),
        hasContent: !!s.summaryContent,
        jobStatus: s.job?.status || 'no job',
        jobProgress: s.job?.progress || 0
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();