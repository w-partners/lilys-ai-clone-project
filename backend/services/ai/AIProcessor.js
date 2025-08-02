const GeminiService = require('./GeminiService');
const OpenAIService = require('./OpenAIService');
const ContentExtractor = require('./ContentExtractor');
const QueueService = require('../QueueService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class AIProcessor {
  constructor() {
    this.geminiService = new GeminiService();
    this.openaiService = new OpenAIService();
    this.contentExtractor = new ContentExtractor();
    this.queueService = new QueueService();
  }

  async processContent(fileData, options = {}) {
    const jobId = uuidv4();
    const { provider = 'gemini', contentType, userId } = options;

    try {
      logger.info(`Starting AI processing for job ${jobId}`, {
        provider,
        contentType,
        userId,
        fileSize: fileData.size
      });

      // Extract content based on type
      const extractedContent = await this.contentExtractor.extract(fileData, contentType);
      
      // Queue the AI processing job
      const job = await this.queueService.addJob('ai-processing', {
        jobId,
        content: extractedContent,
        provider,
        userId,
        metadata: {
          originalFileName: fileData.originalname,
          fileSize: fileData.size,
          contentType,
          timestamp: new Date().toISOString()
        }
      });

      return {
        jobId,
        status: 'queued',
        message: 'Content processing started'
      };
    } catch (error) {
      logger.error(`AI processing failed for job ${jobId}:`, error);
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  async getJobStatus(jobId) {
    try {
      const job = await this.queueService.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      return {
        jobId,
        status: job.status,
        progress: job.progress || 0,
        result: job.result || null,
        error: job.error || null,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      };
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  async processWithProvider(content, provider, metadata = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      let tokensUsed = 0;

      switch (provider) {
        case 'gemini':
          result = await this.geminiService.generateSummary(content);
          tokensUsed = result.tokensUsed || 0;
          break;
        case 'openai':
          result = await this.openaiService.generateSummary(content);
          tokensUsed = result.tokensUsed || 0;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        summary: result.summary,
        provider,
        tokensUsed,
        processingTime,
        metadata: {
          ...metadata,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`Provider ${provider} processing failed:`, error);
      throw error;
    }
  }
}

module.exports = AIProcessor;