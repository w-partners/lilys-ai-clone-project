const axios = require('axios');

async function testAPI() {
  try {
    // First login to get token
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      phone: '01034424668',
      password: 'admin1234'
    });
    
    console.log('Login response:', JSON.stringify(loginRes.data, null, 2));
    const token = loginRes.data.data?.token || loginRes.data.token;
    console.log('Login successful, token:', token);
    
    // Get summaries
    const summariesRes = await axios.get('http://localhost:5001/api/summaries?limit=2', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\nAPI Response structure:');
    console.log(JSON.stringify(summariesRes.data, null, 2));
    
    // Check each summary
    if (summariesRes.data.data && summariesRes.data.data.summaries) {
      console.log('\nSummary details:');
      summariesRes.data.data.summaries.forEach((s, i) => {
        console.log(`\nSummary ${i + 1}:`);
        console.log('- ID:', s.id);
        console.log('- Title:', s.title);
        console.log('- Has summaryContent:', !!s.summaryContent);
        console.log('- Content length:', s.summaryContent?.length || 0);
        console.log('- Has job:', !!s.job);
        console.log('- Job status:', s.job?.status || 'N/A');
        console.log('- Job progress:', s.job?.progress || 0);
        console.log('- Has metadata:', !!s.metadata);
        console.log('- Has results in metadata:', !!s.metadata?.results);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI();