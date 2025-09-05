const axios = require('axios');

async function testYouTubeAPI() {
  try {
    console.log('🎯 Testing YouTube API endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/summaries/youtube', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      background: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000
    });
    
    console.log('✅ Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testYouTubeAPI();