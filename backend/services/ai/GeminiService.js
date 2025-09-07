const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * 시스템 프롬프트를 사용하여 콘텐츠 처리
   * @param {string} systemPrompt - 시스템 프롬프트
   * @param {string} content - 처리할 콘텐츠 (자막)
   * @param {Object} metadata - 추가 메타데이터
   * @returns {Object} 처리 결과
   */
  async processContent(systemPrompt, content, metadata = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting Gemini content processing');

      // 입력 검증
      if (!systemPrompt || !content) {
        throw new Error('시스템 프롬프트와 콘텐츠가 필요합니다.');
      }

      // 프롬프트 구성
      const fullPrompt = this.buildPrompt(systemPrompt, content, metadata);
      
      // 콘텐츠 길이 제한 확인
      if (fullPrompt.length > 30000) {
        content = this.truncateContent(content, 25000);
        logger.warn('Content truncated due to length limit');
      }

      // Gemini API 호출
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      const processingTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(fullPrompt + text);

      logger.info(`Gemini processing completed in ${processingTime}ms`);

      return {
        content: text.trim(),
        tokensUsed,
        processingTime,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        metadata: {
          inputLength: content.length,
          outputLength: text.length,
          ...metadata
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Gemini processing error:', error);
      
      throw this.handleGeminiError(error, processingTime);
    }
  }

  /**
   * 프롬프트 구성
   * @param {string} systemPrompt - 시스템 프롬프트
   * @param {string} content - 콘텐츠
   * @param {Object} metadata - 메타데이터
   * @returns {string} 완성된 프롬프트
   */
  buildPrompt(systemPrompt, content, metadata) {
    let prompt = systemPrompt + '\n\n';

    // 메타데이터 추가
    if (metadata.title) {
      prompt += `영상 제목: ${metadata.title}\n`;
    }
    
    if (metadata.duration) {
      const minutes = Math.floor(metadata.duration / 60);
      const seconds = metadata.duration % 60;
      prompt += `영상 길이: ${minutes}분 ${seconds}초\n`;
    }

    if (metadata.channelName) {
      prompt += `채널명: ${metadata.channelName}\n`;
    }

    if (metadata.language && metadata.language !== 'unknown') {
      prompt += `자막 언어: ${metadata.language}\n`;
    }

    prompt += '\n--- YouTube 영상 자막 ---\n';
    prompt += content;
    prompt += '\n--- 자막 끝 ---\n\n';
    prompt += '위 자막을 바탕으로 요청된 작업을 수행해주세요:';

    return prompt;
  }

  /**
   * 콘텐츠 길이 제한
   * @param {string} content - 원본 콘텐츠
   * @param {number} maxLength - 최대 길이
   * @returns {string} 잘린 콘텐츠
   */
  truncateContent(content, maxLength) {
    if (content.length <= maxLength) return content;
    
    // 문장 단위로 자르기
    const sentences = content.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxLength) break;
      truncated += sentence + '. ';
    }
    
    return truncated || content.substring(0, maxLength);
  }

  /**
   * 토큰 수 추정 (한국어 기준)
   * @param {string} text - 텍스트
   * @returns {number} 추정 토큰 수
   */
  estimateTokens(text) {
    // 한국어: 1 토큰 ≈ 2-3 글자
    // 영어: 1 토큰 ≈ 4 글자
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const otherChars = text.length - koreanChars - englishChars;
    
    return Math.ceil(koreanChars / 2.5 + englishChars / 4 + otherChars / 3);
  }

  /**
   * 배치 처리 - 여러 프롬프트 동시 처리
   * @param {Array} requests - 처리 요청 배열
   * @returns {Array} 처리 결과 배열
   */
  async processBatch(requests) {
    logger.info(`Starting batch processing for ${requests.length} requests`);
    
    try {
      const promises = requests.map(async (request, index) => {
        try {
          await this.delay(index * 1000); // 1초 간격으로 요청
          return await this.processContent(
            request.systemPrompt, 
            request.content, 
            request.metadata
          );
        } catch (error) {
          logger.error(`Batch processing error for request ${index}:`, error);
          return {
            error: error.message,
            provider: 'gemini',
            processingTime: 0,
            tokensUsed: 0
          };
        }
      });

      const results = await Promise.all(promises);
      
      logger.info('Batch processing completed');
      return results;

    } catch (error) {
      logger.error('Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gemini 오류 처리
   * @param {Error} error - 원본 오류
   * @param {number} processingTime - 처리 시간
   * @returns {Error} 처리된 오류
   */
  handleGeminiError(error, processingTime = 0) {
    const message = error.message || '알 수 없는 오류';
    
    if (message.includes('API key')) {
      return new Error('Gemini API 키가 올바르지 않습니다.');
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return new Error('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
    }
    
    if (message.includes('blocked') || message.includes('safety')) {
      return new Error('콘텐츠가 안전 정책에 위배됩니다.');
    }
    
    if (message.includes('timeout') || error.code === 'TIMEOUT') {
      return new Error('AI 처리 시간이 초과되었습니다.');
    }
    
    if (message.includes('network') || error.code === 'ECONNRESET') {
      return new Error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }

    return new Error(`AI 처리 중 오류가 발생했습니다: ${message}`);
  }

  /**
   * 모델 상태 확인
   * @returns {Object} 모델 상태 정보
   */
  async checkModelStatus() {
    try {
      const testPrompt = '안녕하세요. 이것은 테스트 메시지입니다.';
      const startTime = Date.now();
      
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        model: 'gemini-1.5-flash',
        testResponse: text.substring(0, 100)
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        model: 'gemini-1.5-flash'
      };
    }
  }
}

module.exports = GeminiService;