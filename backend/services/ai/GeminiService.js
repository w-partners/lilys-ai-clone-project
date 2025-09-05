const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

class GeminiService {
  constructor() {
    // Support multiple API keys
    const multipleKeys = process.env.GEMINI_API_KEYS;
    const singleKey = process.env.GEMINI_API_KEY;
    
    if (multipleKeys) {
      this.apiKeys = multipleKeys.split(',').map(key => key.trim()).filter(key => key);
    } else if (singleKey) {
      this.apiKeys = [singleKey];
    } else {
      throw new Error('GEMINI_API_KEY or GEMINI_API_KEYS environment variable is required');
    }
    
    this.currentKeyIndex = 0;
    this.keyUsageCount = new Array(this.apiKeys.length).fill(0);
    this.keyErrors = new Array(this.apiKeys.length).fill(0);
    
    logger.info(`Initialized GeminiService with ${this.apiKeys.length} API key(s)`);
    
    this.initializeModel();
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  initializeModel() {
    const apiKey = this.apiKeys[this.currentKeyIndex];
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    logger.info(`Using Gemini API key index ${this.currentKeyIndex} (${apiKey.substring(0, 10)}...)`);
  }

  rotateApiKey() {
    const previousIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    // If we've cycled through all keys, reset error counts
    if (this.currentKeyIndex === 0) {
      logger.warn('All API keys have been cycled through. Resetting error counts.');
      this.keyErrors = new Array(this.apiKeys.length).fill(0);
    }
    
    logger.info(`Rotating from API key ${previousIndex} to ${this.currentKeyIndex}`);
    this.initializeModel();
  }

  async generateSummary(content, options = {}) {
    const { 
      maxTokens = 1000,
      temperature = 0.3,
      customPrompt = null 
    } = options;

    const prompt = customPrompt || this.getDefaultPrompt(content);
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Gemini API call attempt ${attempt} with key index ${this.currentKeyIndex}`);

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature
          }
        });

        const response = await result.response;
        const summary = response.text();

        // Track successful usage
        this.keyUsageCount[this.currentKeyIndex]++;
        
        // Estimate tokens used (Gemini doesn't provide exact count)
        const tokensUsed = Math.ceil((prompt.length + summary.length) / 4);
        
        logger.info(`Gemini summary generated successfully with key ${this.currentKeyIndex}`);
        
        // Extract key points from summary if possible
        let keyPoints = [];
        try {
          // Try to extract numbered points or bullet points from summary
          const lines = summary.split('\n');
          keyPoints = lines
            .filter(line => /^[\d•\-*]/.test(line.trim()))
            .map(line => line.replace(/^[\d.)\-*•]\s*/, '').trim())
            .filter(point => point.length > 0)
            .slice(0, 5); // Limit to 5 key points
        } catch (e) {
          // If extraction fails, use empty array
          keyPoints = [];
        }
        
        return {
          summary,
          keyPoints,
          originalContent: content, // Include original content for transcript storage
          tokensUsed,
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          metadata: {
            title: options.title || null,
            transcript: content // Store transcript in metadata for YouTube videos
          }
        };
      } catch (error) {
        lastError = error;
        logger.error(`Gemini API attempt ${attempt} failed with key ${this.currentKeyIndex}:`, error);
        
        // Check if it's a quota error
        if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
          logger.warn(`API key ${this.currentKeyIndex} hit quota limit`);
          this.keyErrors[this.currentKeyIndex]++;
          
          // Try next API key if available
          if (this.apiKeys.length > 1) {
            this.rotateApiKey();
            continue; // Retry with new key
          }
        }
        
        // Check if it's a 503 error
        if (error.message && error.message.includes('503')) {
          logger.warn('Gemini API is temporarily overloaded (503)');
          if (attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
            continue;
          }
        }
        
        if (attempt === this.maxRetries) {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Failed to generate summary after all retries');
  }

  getDefaultPrompt(content) {
    return `Please provide a comprehensive summary of the following content in Korean. Include:
1. Main topic and purpose
2. Key points and arguments
3. Important details and examples
4. Conclusions or outcomes

Content:
${content}`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processText(text, options = {}) {
    const { 
      systemPrompt = '',
      maxTokens = 1000,
      temperature = 0.3
    } = options;

    console.log('GeminiService.processText called with text length:', text?.length, 'and systemPrompt length:', systemPrompt?.length);
    
    const prompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling Gemini API with prompt length: ${prompt.length}, attempt ${attempt}, key index ${this.currentKeyIndex}`);
        
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature
          }
        });

        console.log('Gemini API call completed, getting response...');
        const response = await result.response;
        const content = response.text();
        console.log('Got response with length:', content?.length);

        // Track successful usage
        this.keyUsageCount[this.currentKeyIndex]++;

        return {
          content,
          tokensUsed: Math.ceil((prompt.length + content.length) / 4)
        };
      } catch (error) {
        lastError = error;
        logger.error(`Gemini processText attempt ${attempt} failed with key ${this.currentKeyIndex}:`, error);
        
        // Check if it's a quota error
        if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
          logger.warn(`API key ${this.currentKeyIndex} hit quota limit in processText`);
          this.keyErrors[this.currentKeyIndex]++;
          
          // Try next API key if available
          if (this.apiKeys.length > 1) {
            this.rotateApiKey();
            continue; // Retry with new key
          }
        }
        
        // Check if it's a 503 error
        if (error.message && error.message.includes('503')) {
          logger.warn('Gemini API is temporarily overloaded (503) in processText');
          if (attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
            continue;
          }
        }
        
        if (attempt === this.maxRetries) {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Failed to process text after all retries');
  }

  async testConnection() {
    try {
      const result = await this.model.generateContent('Test connection');
      const response = await result.response;
      return { 
        status: 'connected', 
        message: 'Gemini API is accessible',
        currentKeyIndex: this.currentKeyIndex,
        totalKeys: this.apiKeys.length,
        keyUsage: this.keyUsageCount,
        keyErrors: this.keyErrors
      };
    } catch (error) {
      // Try to rotate key if it's a quota error
      if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
        if (this.apiKeys.length > 1) {
          this.rotateApiKey();
          return { 
            status: 'rotated', 
            message: `Rotated to API key ${this.currentKeyIndex}`,
            currentKeyIndex: this.currentKeyIndex,
            totalKeys: this.apiKeys.length
          };
        }
      }
      return { status: 'error', message: error.message };
    }
  }

  getApiKeyStatus() {
    return {
      currentKeyIndex: this.currentKeyIndex,
      totalKeys: this.apiKeys.length,
      keyUsage: this.keyUsageCount,
      keyErrors: this.keyErrors
    };
  }
}

module.exports = GeminiService;