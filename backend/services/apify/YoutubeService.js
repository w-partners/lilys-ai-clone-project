const { ApifyClient } = require('apify-client');
const logger = require('../../utils/logger');

class ApifyYoutubeService {
  constructor() {
    this.client = new ApifyClient({ 
      token: process.env.APIFY_TOKEN 
    });
    this.actorId = 'streamers/youtube-scraper';
  }

  /**
   * YouTube URL에서 자막을 추출합니다
   * @param {string} youtubeUrl - YouTube 영상 URL
   * @param {string} jobId - 작업 ID
   * @param {Function} onProgress - 진행률 콜백 함수
   * @returns {Object} 추출된 자막 데이터
   */
  async extractSubtitles(youtubeUrl, jobId, onProgress = () => {}) {
    try {
      logger.info(`Starting YouTube subtitle extraction for job ${jobId}`);
      
      // YouTube URL 유효성 검사
      if (!this.isValidYoutubeUrl(youtubeUrl)) {
        throw new Error('유효하지 않은 YouTube URL입니다.');
      }

      onProgress(jobId, 'subtitle_extraction', 10, 'Apify Actor 시작 중...');

      // Apify Actor 실행
      const input = {
        startUrls: [{ url: youtubeUrl }],
        maxResults: 1,
        subtitlesFormat: 'srt',
        subtitlesLanguage: 'ko',
        includeVideoTranscript: true,
        includeVideoDetails: true,
        includeComments: false,
        includeRelatedVideos: false
      };

      const run = await this.client.actor(this.actorId).call(input);
      
      onProgress(jobId, 'subtitle_extraction', 30, 'YouTube 데이터 추출 중...');

      // 실행 상태 모니터링
      await this.monitorProgress(run, jobId, onProgress);

      onProgress(jobId, 'subtitle_extraction', 80, '자막 데이터 처리 중...');

      // 결과 데이터 가져오기
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      if (!items || items.length === 0) {
        throw new Error('영상 데이터를 찾을 수 없습니다.');
      }

      const videoData = items[0];
      const processedData = this.processVideoData(videoData);

      onProgress(jobId, 'subtitle_extraction', 100, '자막 추출 완료');

      logger.info(`YouTube subtitle extraction completed for job ${jobId}`);
      return processedData;

    } catch (error) {
      logger.error(`Apify YouTube service error for job ${jobId}:`, error);
      throw this.handleApifyError(error);
    }
  }

  /**
   * YouTube URL 유효성 검사
   * @param {string} url - 검사할 URL
   * @returns {boolean} 유효 여부
   */
  isValidYoutubeUrl(url) {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  /**
   * Apify Actor 실행 진행률 모니터링
   * @param {Object} run - Apify 실행 객체
   * @param {string} jobId - 작업 ID
   * @param {Function} onProgress - 진행률 콜백 함수
   */
  async monitorProgress(run, jobId, onProgress) {
    let attempts = 0;
    const maxAttempts = 60; // 10분 타임아웃 (10초 간격)

    while (attempts < maxAttempts) {
      try {
        const runInfo = await this.client.run(run.id).get();
        
        logger.info(`Apify run status for job ${jobId}: ${runInfo.status}`);

        const progress = this.calculateProgress(runInfo.status, attempts, maxAttempts);
        onProgress(jobId, 'subtitle_extraction', progress, `Apify 처리 중... (${runInfo.status})`);

        if (runInfo.status === 'SUCCEEDED') {
          return runInfo;
        }

        if (runInfo.status === 'FAILED' || runInfo.status === 'TIMED_OUT' || runInfo.status === 'ABORTED') {
          throw new Error(`Apify Actor 실행 실패: ${runInfo.status}`);
        }

        // 10초 대기
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

      } catch (error) {
        logger.error(`Error monitoring Apify progress for job ${jobId}:`, error);
        throw error;
      }
    }

    throw new Error('Apify Actor 실행 타임아웃');
  }

  /**
   * 진행률 계산
   * @param {string} status - Apify 상태
   * @param {number} attempts - 시도 횟수
   * @param {number} maxAttempts - 최대 시도 횟수
   * @returns {number} 진행률 (30-80%)
   */
  calculateProgress(status, attempts, maxAttempts) {
    const baseProgress = 30;
    const maxProgress = 80;
    
    if (status === 'SUCCEEDED') return maxProgress;
    
    const progressRange = maxProgress - baseProgress;
    const timeProgress = (attempts / maxAttempts) * progressRange;
    
    return Math.min(baseProgress + timeProgress, maxProgress - 5);
  }

  /**
   * 비디오 데이터 처리
   * @param {Object} videoData - Apify에서 받은 비디오 데이터
   * @returns {Object} 처리된 데이터
   */
  processVideoData(videoData) {
    const result = {
      title: videoData.title || '제목 없음',
      description: videoData.description || '',
      duration: videoData.duration || 0,
      viewCount: videoData.viewCount || 0,
      publishedAt: videoData.publishedAt,
      channelName: videoData.channelName || '',
      subtitles: [],
      language: 'unknown'
    };

    // 자막 데이터 처리
    if (videoData.subtitles && videoData.subtitles.length > 0) {
      // 언어 우선순위: 한국어 > 영어 > 기타
      const priorityOrder = ['ko', 'kr', 'en', 'auto'];
      
      let selectedSubtitle = null;
      for (const lang of priorityOrder) {
        selectedSubtitle = videoData.subtitles.find(sub => 
          sub.language === lang || sub.languageCode === lang
        );
        if (selectedSubtitle) break;
      }

      // 우선순위에 없으면 첫 번째 자막 사용
      if (!selectedSubtitle && videoData.subtitles.length > 0) {
        selectedSubtitle = videoData.subtitles[0];
      }

      if (selectedSubtitle) {
        result.subtitles = this.parseSubtitleText(selectedSubtitle.text || selectedSubtitle.content || '');
        result.language = selectedSubtitle.language || selectedSubtitle.languageCode || 'unknown';
        result.rawSubtitle = selectedSubtitle.text || selectedSubtitle.content || '';
      }
    }

    // 트랜스크립트가 있으면 사용
    if (videoData.transcript) {
      result.transcript = videoData.transcript;
      if (!result.rawSubtitle) {
        result.rawSubtitle = videoData.transcript;
        result.subtitles = this.parseSubtitleText(videoData.transcript);
      }
    }

    // 자막이 없는 경우 설명 사용
    if (!result.rawSubtitle && result.description) {
      result.rawSubtitle = result.description;
      result.subtitles = [{ text: result.description, start: 0, end: 0 }];
      result.language = 'description';
    }

    // 단어 수 계산
    result.wordCount = this.countWords(result.rawSubtitle);

    return result;
  }

  /**
   * 자막 텍스트 파싱
   * @param {string} subtitleText - 자막 텍스트
   * @returns {Array} 파싱된 자막 배열
   */
  parseSubtitleText(subtitleText) {
    if (!subtitleText) return [];

    // SRT 형식인지 확인
    if (subtitleText.includes('-->')) {
      return this.parseSRTFormat(subtitleText);
    }

    // 일반 텍스트인 경우
    const sentences = subtitleText.split(/[.!?]+/).filter(s => s.trim());
    return sentences.map((sentence, index) => ({
      text: sentence.trim(),
      start: index * 5, // 임시 타임스탬프
      end: (index + 1) * 5
    }));
  }

  /**
   * SRT 형식 자막 파싱
   * @param {string} srtText - SRT 형식 자막
   * @returns {Array} 파싱된 자막 배열
   */
  parseSRTFormat(srtText) {
    const subtitles = [];
    const blocks = srtText.split('\n\n').filter(block => block.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) continue;

      const text = lines.slice(2).join(' ').trim();
      if (!text) continue;

      subtitles.push({
        text: text,
        start: this.timeToSeconds(timeMatch[1]),
        end: this.timeToSeconds(timeMatch[2])
      });
    }

    return subtitles;
  }

  /**
   * 시간 문자열을 초로 변환
   * @param {string} timeStr - 시간 문자열 (HH:MM:SS,mmm)
   * @returns {number} 초 단위 시간
   */
  timeToSeconds(timeStr) {
    const [time, ms] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000);
  }

  /**
   * 단어 수 계산
   * @param {string} text - 텍스트
   * @returns {number} 단어 수
   */
  countWords(text) {
    if (!text) return 0;
    // 한글, 영어, 숫자를 단어로 계산
    const words = text.match(/[\w가-힣]+/g);
    return words ? words.length : 0;
  }

  /**
   * Apify 오류 처리
   * @param {Error} error - 원본 오류
   * @returns {Error} 처리된 오류
   */
  handleApifyError(error) {
    const message = error.message || '알 수 없는 오류';
    
    if (message.includes('rate limit')) {
      return new Error('API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.');
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return new Error('YouTube 영상을 찾을 수 없습니다. URL을 확인해주세요.');
    }
    
    if (message.includes('private') || message.includes('unavailable')) {
      return new Error('비공개 영상이거나 사용할 수 없는 영상입니다.');
    }
    
    if (message.includes('timeout')) {
      return new Error('영상 처리 시간이 초과되었습니다. 더 짧은 영상을 시도해보세요.');
    }

    return new Error(`YouTube 자막 추출 중 오류가 발생했습니다: ${message}`);
  }
}

module.exports = ApifyYoutubeService;