const db = require('../models');

async function updateTranscriptPrompt() {
  try {
    const updatedPrompt = `유튜브 비디오의 전체 스크립트를 처음부터 끝까지 타임스탬프와 함께 다음 형식으로 정리해주세요:

[타임스탬프] 내용

예시:
[00:00] 인트로
[00:30] 주제 소개
[01:15] 핵심 내용 설명

중요: 
- 비디오의 처음(00:00)부터 마지막 순간까지 모든 내용을 포함해주세요
- 영상이 끝나는 시점까지 완전히 분석해주세요
- 중간에 누락되는 부분이 없도록 전체 시간대를 커버해주세요
- 비디오 길이와 관계없이 전체 내용을 타임스탬프와 함께 제공해주세요`;

    const result = await db.SystemPrompt.update(
      { prompt: updatedPrompt },
      { where: { name: '타임스탬프 스크립트' } }
    );
    
    console.log('✅ 타임스탬프 스크립트 프롬프트 업데이트 완료:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ 프롬프트 업데이트 실패:', error);
    process.exit(1);
  }
}

updateTranscriptPrompt();
