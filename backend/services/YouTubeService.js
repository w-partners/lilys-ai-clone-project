const fetch = require('node-fetch');
const { YoutubeTranscript } = require('youtube-transcript');

class YouTubeService {
  constructor() {
    // Gemini API를 사용하므로 YouTube API 키는 필요없음
    // CLAUDE.md에 있는 테스트용 API 키 사용
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyBhXb6o6nxY2Neo38qZzUsC7ReQPic1kRY';
    this.geminiModel = 'gemini-2.0-flash';
    this.geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  /**
   * YouTube URL에서 비디오 ID 추출
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * YouTube 비디오 정보 가져오기
   */
  async getVideoInfo(videoId) {
    try {
      // YouTube 페이지에서 메타데이터 추출
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoUrl);
      const html = await response.text();
      
      // 제목 추출 - 여러 방법 시도
      let title = null;
      
      // 방법 1: og:title 메타 태그
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
      }
      
      // 방법 2: JSON-LD 데이터
      if (!title) {
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.name) {
              title = jsonData.name;
            }
          } catch (e) {
            console.log('JSON-LD parse failed');
          }
        }
      }
      
      // 방법 3: title 태그
      if (!title) {
        const titleTagMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleTagMatch) {
          title = titleTagMatch[1].replace(' - YouTube', '').trim();
        }
      }
      
      // 방법 4: ytInitialData에서 추출
      if (!title) {
        const ytDataMatch = html.match(/var ytInitialData = ({.+?});/s);
        if (ytDataMatch) {
          try {
            const ytData = JSON.parse(ytDataMatch[1]);
            const videoDetails = ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer;
            if (videoDetails?.title?.runs?.[0]?.text) {
              title = videoDetails.title.runs[0].text;
            }
          } catch (e) {
            console.log('ytInitialData parse failed');
          }
        }
      }
      
      // 기본값
      if (!title) {
        title = `YouTube Video ${videoId}`;
      }
      
      // 설명 추출
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/) || 
                       html.match(/<meta name="description" content="([^"]+)"/);
      const description = descMatch ? descMatch[1] : 'Video description';
      
      // 채널명 추출
      const authorMatch = html.match(/"author":"([^"]+)"/) || 
                         html.match(/<link itemprop="name" content="([^"]+)"/);
      const channel = authorMatch ? authorMatch[1] : 'YouTube Channel';
      
      // 썸네일 추출
      const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/) ||
                        html.match(/<link rel="image_src" href="([^"]+)"/);
      const thumbnail = thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      console.log(`✅ 비디오 정보 추출 성공: ${title}`);
      
      return {
        title,
        description,
        channel,
        duration: 'Unknown',
        viewCount: 0,
        publishedAt: new Date().toISOString(),
        thumbnail,
        videoUrl
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      // 오류 발생 시 기본 정보 반환
      return {
        title: `YouTube Video ${videoId}`,
        description: 'Video description',
        channel: 'YouTube Channel',
        duration: 'Unknown',
        viewCount: 0,
        publishedAt: new Date().toISOString(),
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    }
  }

  /**
   * YouTube 자막 추출 (Gemini API 사용)
   */
  async extractSubtitles(videoId, language = 'ko') {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const prompt = "Transcribe the video in Korean. Return only the spoken dialogue, verbatim. Omit any additional text or descriptions. If the spoken language is not Korean, translate the transcription into natural Korean.";
      
      // Gemini API 호출
      const result = await this.callGeminiAPI(videoUrl, prompt);
      
      if (result && result.text) {
        // 텍스트를 문장 단위로 분리하여 가상의 타임스탬프 생성
        const sentences = result.text.split(/[.!?]+/).filter(s => s.trim());
        const subtitles = sentences.map((text, index) => ({
          start: index * 10,
          duration: 10,
          text: text.trim()
        }));
        
        return {
          subtitles,
          fullText: result.text,
          language,
          hasSubtitles: true
        };
      }
      
      return {
        subtitles: [],
        fullText: '',
        language,
        hasSubtitles: false
      };
    } catch (error) {
      console.error('Failed to extract subtitles:', error);
      return {
        subtitles: [],
        fullText: '',
        language,
        hasSubtitles: false
      };
    }
  }
  
  /**
   * YouTube 자막 추출 (타임스탬프 포함) - youtube-transcript 라이브러리 사용
   */
  async extractTimestampedSubtitles(videoId, language = 'ko') {
    try {
      // youtube-transcript 라이브러리를 사용하여 자막 추출
      console.log(`📝 자막 추출 시작: ${videoId}`);
      
      let transcript = null;
      let extractedLanguage = language;
      
      // 자막 추출 시도 (한국어 우선)
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: language,
          country: 'KR'
        });
        console.log('✅ 한국어 자막 발견');
        extractedLanguage = 'ko';
      } catch (error) {
        console.log('⚠️ 한국어 자막 없음, 영어 시도...');
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: 'en',
            country: 'US'
          });
          console.log('✅ 영어 자막 발견');
          extractedLanguage = 'en';
        } catch (error) {
          console.log('⚠️ 특정 언어 없음, 사용 가능한 자막 검색...');
          try {
            transcript = await YoutubeTranscript.fetchTranscript(videoId);
            console.log('✅ 자막 발견 (언어 자동 선택)');
            extractedLanguage = 'auto';
          } catch (error) {
            console.log('❌ 자막 없음');
          }
        }
      }
      
      if (transcript && transcript.length > 0) {
        // 자막 데이터 정리 및 타임스탬프 수정
        const subtitles = [];
        let lastEndTime = 0;
        
        for (let i = 0; i < transcript.length; i++) {
          const item = transcript[i];
          // offset이 undefined이거나 잘못된 경우 처리
          const startTime = item.offset !== undefined ? Math.floor(item.offset / 1000) : lastEndTime;
          const duration = item.duration !== undefined ? Math.floor(item.duration / 1000) : 5;
          
          subtitles.push({
            start: startTime,
            duration: duration,
            text: item.text.trim()
          });
          
          lastEndTime = startTime + duration;
        }
        
        // 전체 텍스트 생성
        const fullText = subtitles.map(sub => sub.text).join(' ');
        
        // 비디오 길이 계산 (마지막 자막의 종료 시간)
        const videoDuration = subtitles.length > 0 ? 
          subtitles[subtitles.length - 1].start + subtitles[subtitles.length - 1].duration : 0;
        
        console.log(`📊 자막 추출 완료:`);
        console.log(`   - 세그먼트 수: ${subtitles.length}개`);
        console.log(`   - 전체 텍스트 길이: ${fullText.length}자`);
        console.log(`   - 비디오 길이: ${Math.floor(videoDuration / 60)}분 ${videoDuration % 60}초`);
        console.log(`   - 언어: ${extractedLanguage}`);
        
        // 자막이 5분(300초)에서 끊기는지 확인
        if (videoDuration <= 300 && subtitles.length > 50) {
          console.log('⚠️ 경고: 자막이 일부만 추출되었을 수 있습니다. 전체 자막을 다시 시도합니다...');
          
          // 전체 자막을 강제로 가져오기 위한 재시도
          try {
            const fullTranscript = await YoutubeTranscript.fetchTranscript(videoId);
            if (fullTranscript && fullTranscript.length > transcript.length) {
              console.log(`✅ 전체 자막 재추출 성공: ${fullTranscript.length}개 세그먼트`);
              transcript = fullTranscript;
              
              // 재처리
              subtitles.length = 0;
              lastEndTime = 0;
              
              for (let i = 0; i < transcript.length; i++) {
                const item = transcript[i];
                const startTime = item.offset !== undefined ? Math.floor(item.offset / 1000) : lastEndTime;
                const duration = item.duration !== undefined ? Math.floor(item.duration / 1000) : 5;
                
                subtitles.push({
                  start: startTime,
                  duration: duration,
                  text: item.text.trim()
                });
                
                lastEndTime = startTime + duration;
              }
            }
          } catch (retryError) {
            console.log('재시도 실패, 현재 자막 사용');
          }
        }
        
        return {
          subtitles,
          fullText: subtitles.map(sub => sub.text).join(' '),
          language: extractedLanguage,
          hasSubtitles: true,
          videoDuration: videoDuration
        };
      }
      
      console.log('❌ 자막 없음, 빈 결과 반환');
      return {
        subtitles: [],
        fullText: '',
        language,
        hasSubtitles: false,
        videoDuration: 0
      };
    } catch (error) {
      console.error('💥 자막 추출 실패:', error);
      return {
        subtitles: [],
        fullText: '',
        language,
        hasSubtitles: false,
        videoDuration: 0
      };
    }
  }
  
  /**
   * Gemini API를 사용하여 비디오 요약 생성
   */
  async generateSummary(videoId, customPrompt = null) {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const prompt = customPrompt || "Provide a concise summary of the main points in nested bullets, using quotes only when absolutely essential for clarity in Korean. * Summarize in a structured hierarchical format. * Start output directly with the response. * Omit responses like 'OK,' 'Sure,' or 'Here is your request,' and begin directly with the requested content.";
      
      console.log(`🎥 Generating summary for video with prompt: ${prompt.substring(0, 100)}...`);
      const result = await this.callGeminiAPI(videoUrl, prompt);
      return result ? result.text : '';
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return '';
    }
  }
  
  /**
   * Gemini API 호출
   */
  async callGeminiAPI(videoUrl, prompt) {
    try {
      // trans.json 워크플로우와 동일한 모델 사용
      const model = 'gemini-2.0-flash';
      const url = `${this.geminiApiUrl}/${model}:generateContent?key=${this.geminiApiKey}`;
      
      // trans.json과 동일한 요청 구조
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            { file_data: { file_uri: videoUrl } }
          ]
        }]
      };
      
      // API 키의 일부만 로그에 표시 (보안을 위해)
      const maskedKey = this.geminiApiKey ? `${this.geminiApiKey.substring(0, 10)}...` : 'NO_KEY';
      console.log('🔗 Gemini API 호출 (API 키:', maskedKey, ')');
      console.log('📦 요청 데이터:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📊 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Gemini API 오류 응답:', errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      console.log('✅ Gemini API 성공 응답:', JSON.stringify(data, null, 2));
      
      // Gemini API 응답 구조에서 텍스트 추출
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const text = data.candidates[0].content.parts[0].text;
        console.log('📝 추출된 텍스트:', text.substring(0, 200) + '...');
        return { text, model };
      }
      
      throw new Error('Invalid Gemini API response structure');
    } catch (error) {
      console.error('💥 Gemini API 호출 실패:', error.message);
      throw error;
    }
  }

  /**
   * YouTube 비디오에서 오디오 추출 (음성 인식용)
   * 실제 구현 시에는 ytdl-core 라이브러리 사용
   */
  async extractAudio(videoId) {
    try {
      // 실제 구현 시:
      // const ytdl = require('ytdl-core');
      // const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      //   quality: 'lowestaudio',
      //   filter: 'audioonly'
      // });
      
      // 임시로 null 반환
      return null;
    } catch (error) {
      console.error('Failed to extract audio:', error);
      throw error;
    }
  }

  /**
   * ISO 8601 duration을 사람이 읽을 수 있는 형식으로 변환
   */
  parseDuration(isoDuration) {
    if (!isoDuration) return 'Unknown';
    
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);
    if (seconds > 0) parts.push(`${seconds}초`);
    
    return parts.join(' ') || '0초';
  }

  /**
   * 자막 텍스트를 시간대별로 구조화
   */
  structureSubtitles(subtitles) {
    const chapters = [];
    let currentChapter = null;
    
    // 30초 단위로 챕터 생성
    subtitles.forEach(subtitle => {
      const chapterIndex = Math.floor(subtitle.start / 30);
      const chapterStart = chapterIndex * 30;
      
      if (!currentChapter || currentChapter.index !== chapterIndex) {
        currentChapter = {
          index: chapterIndex,
          start: chapterStart,
          end: chapterStart + 30,
          timeLabel: this.formatTime(chapterStart),
          texts: []
        };
        chapters.push(currentChapter);
      }
      
      currentChapter.texts.push(subtitle.text);
    });
    
    return chapters.map(chapter => ({
      time: chapter.timeLabel,
      content: chapter.texts.join(' ')
    }));
  }

  /**
   * 초를 MM:SS 형식으로 변환
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = YouTubeService;