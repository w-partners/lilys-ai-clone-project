const db = require('./models');

async function checkYouTubeHistory() {
  try {
    // YouTube summaries 확인
    const summaries = await db.Summary.findAll({
      where: { sourceType: 'youtube' },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'title', 'sourceUrl', 'createdAt', 'metadata']
    });
    
    console.log('\n=== YouTube Summaries in Database ===\n');
    console.log('Total found:', summaries.length);
    console.log('');
    
    const videoIds = [];
    
    summaries.forEach((summary, index) => {
      const videoIdMatch = summary.sourceUrl?.match(/(?:v=|\/shorts\/|youtu\.be\/)([^&\s]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : 'N/A';
      videoIds.push(videoId);
      
      console.log(`${index + 1}. Title: ${summary.title?.substring(0, 50)}...`);
      console.log(`   URL: ${summary.sourceUrl}`);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   Created: ${summary.createdAt}`);
      
      // metadata에서 실제 처리된 videoId 확인
      if (summary.metadata?.videoId) {
        console.log(`   Metadata Video ID: ${summary.metadata.videoId}`);
      }
      console.log('---');
    });
    
    const uniqueVideoIds = [...new Set(videoIds)];
    console.log('\n=== Summary ===');
    console.log('Total summaries:', summaries.length);
    console.log('Unique video IDs:', uniqueVideoIds.length);
    console.log('Video IDs:', uniqueVideoIds);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

checkYouTubeHistory();