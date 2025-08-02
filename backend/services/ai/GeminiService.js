const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  async generateSummary(content, options = {}) {
    const { 
      maxTokens = 1000,
      temperature = 0.3,
      customPrompt = null 
    } = options;

    const prompt = customPrompt || this.getDefaultPrompt(content);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Gemini API call attempt ${attempt}`);

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature
          }
        });

        const response = await result.response;
        const summary = response.text();

        // Estimate tokens used (Gemini doesn't provide exact count)
        const estimatedTokens = Math.ceil((prompt.length + summary.length) / 4);

        logger.info('Gemini processing completed successfully', {
          estimatedTokens,
          summaryLength: summary.length
        });

        return {
          summary,
          tokensUsed: estimatedTokens,
          provider: 'gemini'
        };
      } catch (error) {
        logger.error(`Gemini API attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Gemini processing failed after ${this.maxRetries} attempts: ${error.message}`);
        }

        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  getDefaultPrompt(content) {
    return `Please provide a comprehensive summary of the following content. Focus on key points, main ideas, and important details:

${content}

Summary:`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection() {
    try {
      const result = await this.model.generateContent('Test connection');
      const response = await result.response;
      return { status: 'connected', message: 'Gemini API is accessible' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = GeminiService;