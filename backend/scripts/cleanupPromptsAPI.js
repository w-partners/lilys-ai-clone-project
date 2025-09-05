const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY0NTUxNTY5LWZhYWEtNDRiMC1iNmJiLWFlMzBkMDkzYWZjYSIsInBob25lIjoiMDEwMzQ0MjQ2NjgiLCJlbWFpbCI6ImFkbWluQGxpbHlzLmFpIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU1Njk0Njk4LCJleHAiOjE3NTYyOTk0OTh9.WfHAoRLG9PpvKA2vjKtnEtVulnbJ5gPtOIzO-zKKu8o';
const API_URL = 'http://localhost:5001/api/prompts';

async function cleanupAndCreatePrompts() {
  try {
    // 1. 모든 프롬프트 가져오기
    const response = await axios.get(`${API_URL}/all`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const allPrompts = response.data.data;
    console.log(`현재 프롬프트: ${allPrompts.length}개`);

    // 2. 모든 프롬프트 삭제
    for (const prompt of allPrompts) {
      try {
        await axios.delete(`${API_URL}/${prompt.id}`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`❌ 삭제: ${prompt.name}`);
      } catch (error) {
        console.log(`삭제 실패: ${prompt.name} - ${error.message}`);
      }
    }

    // 3. 새로운 프롬프트 생성
    const wantedPrompts = [
      {
        name: '타임스탬프 스크립트',
        prompt: `유튜브 비디오 스크립트를 타임스탬프와 함께 다음 형식으로 정리해주세요:

[타임스탬프] 내용

예시:
[00:00] 인트로
[00:30] 주제 소개
[01:15] 핵심 내용 설명

비디오의 전체 내용을 시간 순서대로 정리하되, 중요한 부분은 더 자세히 설명해주세요.`,
        category: 'transcript',
        order: 1,
        isActive: true
      },
      {
        name: '구조화된 요약',
        prompt: `다음 비디오 내용을 구조화된 형식으로 요약해주세요:

## 📌 핵심 요약
(3-5줄로 전체 내용 요약)

## 🎯 주요 포인트
• 포인트 1
• 포인트 2
• 포인트 3

## 💡 핵심 통찰
(가장 중요한 메시지나 교훈)

## 🔍 상세 내용
(주요 주제별로 자세한 설명)

## 📝 결론
(최종 정리 및 시사점)`,
        category: 'summary',
        order: 2,
        isActive: true
      }
    ];

    for (const prompt of wantedPrompts) {
      try {
        await axios.post(API_URL, prompt, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ 생성: ${prompt.name} (${prompt.category})`);
      } catch (error) {
        console.log(`생성 실패: ${prompt.name} - ${error.message}`);
      }
    }

    // 4. 최종 확인
    const finalResponse = await axios.get(`${API_URL}/all`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const finalPrompts = finalResponse.data.data;
    console.log(`\n📋 최종 프롬프트: ${finalPrompts.length}개`);
    finalPrompts.forEach(p => {
      console.log(`- ${p.name} (${p.category})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanupAndCreatePrompts();