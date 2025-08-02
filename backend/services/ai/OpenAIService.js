const OpenAI = require('openai');
const logger = require('../../utils/logger');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: this.apiKey
    });
    
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  async generateSummary(content, options = {}) {
    const {
      model = 'gpt-3.5-turbo',
      maxTokens = 1000,
      temperature = 0.3,
      customPrompt = null
    } = options;

    const systemPrompt = 'You are a helpful assistant that creates comprehensive summaries of content.';
    const userPrompt = customPrompt || this.getDefaultPrompt(content);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`OpenAI API call attempt ${attempt}`, { model });

        const completion = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        });

        const summary = completion.choices[0].message.content;
        const tokensUsed = completion.usage.total_tokens;

        logger.info('OpenAI processing completed successfully', {
          tokensUsed,
          model,
          summaryLength: summary.length
        });

        return {
          summary,
          tokensUsed,
          provider: 'openai',
          model
        };
      } catch (error) {
        logger.error(`OpenAI API attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`OpenAI processing failed after ${this.maxRetries} attempts: ${error.message}`);
        }

        // Handle rate limiting
        if (error.status === 429) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          logger.warn(`Rate limited, waiting ${delay}ms before retry`);
          await this.sleep(delay);
        } else {
          // Exponential backoff for other errors
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }
  }

  getDefaultPrompt(content) {
    return `Please provide a comprehensive summary of the following content. Focus on key points, main ideas, and important details:\n\n${content}\n\nSummary:`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection() {
    try {
      const models = await this.openai.models.list();
      return { status: 'connected', message: 'OpenAI API is accessible', modelCount: models.data.length };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = OpenAIService;