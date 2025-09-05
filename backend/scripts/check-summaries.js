const db = require('../models');

(async () => {
  try {
    // Get recent summaries with their job data
    const summaries = await db.Summary.findAll({
      limit: 5,
      include: [{
        model: db.Job,
        as: 'job',
        attributes: ['id', 'status', 'progress', 'createdAt', 'completedAt']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('Recent summaries with job data:');
    summaries.forEach(s => {
      console.log({
        id: s.id,
        title: s.title?.substring(0, 30),
        hasContent: !!s.summaryContent,
        contentLength: s.summaryContent?.length || 0,
        jobId: s.jobId,
        jobStatus: s.job?.status || 'no job',
        jobProgress: s.job?.progress || 0,
        hasMetadata: !!s.metadata,
        hasResults: !!s.metadata?.results
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();