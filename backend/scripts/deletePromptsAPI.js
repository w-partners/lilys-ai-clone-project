const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY0NTUxNTY5LWZhYWEtNDRiMC1iNmJiLWFlMzBkMDkzYWZjYSIsInBob25lIjoiMDEwMzQ0MjQ2NjgiLCJlbWFpbCI6ImFkbWluQGxpbHlzLmFpIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1Njk0Njk4LCJleHAiOjE3NTYyOTk0OTh9.WfHAoRLG9PpvKA2vjKtnEtVulnbJ5gPtOIzO-zKKu8o';
const API_URL = 'http://localhost:5001/api/prompts';

async function deleteUnneededPrompts() {
  try {
    // 남겨둘 프롬프트
    const keepPrompts = [
      '타임스탬프 스크립트',
      '구조화된 요약'
    ];

    // 모든 프롬프트 가져오기
    const response = await axios.get(`${API_URL}/all`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const allPrompts = response.data.data;
    console.log(`전체 프롬프트: ${allPrompts.length}개`);

    // 삭제할 프롬프트 필터링
    const promptsToDelete = allPrompts.filter(p => !keepPrompts.includes(p.name));
    
    console.log(`\n삭제할 프롬프트: ${promptsToDelete.length}개`);
    
    // 각 프롬프트 삭제
    for (const prompt of promptsToDelete) {
      try {
        await axios.delete(`${API_URL}/${prompt.id}`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ 삭제: ${prompt.name}`);
      } catch (error) {
        console.log(`❌ 삭제 실패: ${prompt.name} - ${error.message}`);
      }
    }

    // 남은 프롬프트 확인
    const remainingResponse = await axios.get(`${API_URL}/all`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const remainingPrompts = remainingResponse.data.data;
    console.log(`\n남은 프롬프트: ${remainingPrompts.length}개`);
    remainingPrompts.forEach(p => {
      console.log(`- ${p.name} (${p.category})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteUnneededPrompts();