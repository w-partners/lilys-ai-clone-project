const GeminiService = require('./GeminiService');
const OpenAIService = require('./OpenAIService');
const ContentExtractor = require('./ContentExtractor');
const QueueService = require('../QueueService');
const StorageService = require('../StorageService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
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
    let tempFilePath = null;

    try {
      logger.info(`Starting AI processing for job ${jobId}`, {
        provider,
        contentType,
        userId,
        fileSize: fileData.size
      });

      // Save file temporarily if it's a buffer
      if (fileData.buffer) {
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        tempFilePath = path.join(tempDir, `${jobId}_${fileData.originalname}`);
        await fs.writeFile(tempFilePath, fileData.buffer);
      }

      // Extract content based on type
      const extractedContent = await this.contentExtractor.extract(fileData, contentType);
      
      // Queue the AI processing job
      const job = await this.queueService.addJob('ai-processing', {
        jobId,
        content: extractedContent,
        provider,
        userId,
        tempFilePath,
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
      // Clean up temp file on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {
          logger.warn('Failed to delete temp file:', e);
        }
      }
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

      // Upload file to cloud storage if available
      let storageUrl = null;
      if (metadata.tempFilePath && StorageService.enabled) {
        try {
          const destination = `summaries/${metadata.userId}/${metadata.jobId}/${path.basename(metadata.tempFilePath)}`;
          storageUrl = await StorageService.uploadFile(metadata.tempFilePath, destination);
          logger.info(`File uploaded to cloud storage: ${destination}`);
        } catch (error) {
          logger.warn('Failed to upload file to cloud storage:', error);
          // Continue without cloud storage
        }
      }

      return {
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        originalContent: result.originalContent || content, // Include original content/transcript
        provider,
        model: result.model || 'gemini-1.5-flash',
        tokensUsed,
        processingTime,
        storageUrl,
        metadata: {
          ...metadata,
          ...result.metadata,
          processedAt: new Date().toISOString()
        },
        tags: result.tags || [],
        cost: result.cost || 0
      };
    } catch (error) {
      logger.error(`Provider ${provider} processing failed:`, error);
      throw error;
    }
  }
}

module.exports = AIProcessor;