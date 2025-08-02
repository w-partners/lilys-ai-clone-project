const AIProcessor = require('../services/ai/AIProcessor');
const logger = require('../utils/logger');
const WebSocket = require('../utils/websocket');

class AIWorker {
  constructor() {
    this.aiProcessor = new AIProcessor();
    this.websocket = new WebSocket();
  }

  async processJob(job) {
    const { jobId, content, provider, userId, metadata } = job.data;
    
    try {
      logger.info(`Processing AI job ${jobId}`, {
        provider,
        userId,
        contentLength: content.text?.length || 0
      });

      // Update job progress
      await job.progress(10);
      this.websocket.sendToUser(userId, {
        type: 'processing_update',
        jobId,
        status: 'extracting',
        progress: 10
      });

      // Process content with AI
      await job.progress(30);
      this.websocket.sendToUser(userId, {
        type: 'processing_update',
        jobId,
        status: 'ai_processing',
        progress: 30
      });

      const result = await this.aiProcessor.processWithProvider(
        content.text,
        provider,
        metadata
      );

      await job.progress(80);
      this.websocket.sendToUser(userId, {
        type: 'processing_update',
        jobId,
        status: 'saving',
        progress: 80
      });

      // Here you would save the result to database
      // For now, we'll just return the result
      const finalResult = {
        jobId,
        summary: result.summary,
        provider: result.provider,
        tokensUsed: result.tokensUsed,
        processingTime: result.processingTime,
        metadata: {
          ...metadata,
          ...result.metadata,
          originalContent: {
            filename: metadata.originalFileName,
            size: metadata.fileSize,
            type: metadata.contentType
          }
        },
        createdAt: new Date().toISOString()
      };

      await job.progress(100);
      this.websocket.sendToUser(userId, {
        type: 'processing_complete',
        jobId,
        status: 'completed',
        progress: 100,
        result: finalResult
      });

      logger.info(`AI job ${jobId} completed successfully`, {
        provider,
        tokensUsed: result.tokensUsed,
        processingTime: result.processingTime
      });

      return finalResult;
    } catch (error) {
      logger.error(`AI job ${jobId} failed:`, error);
      
      this.websocket.sendToUser(userId, {
        type: 'processing_error',
        jobId,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  async handleFailedJob(job, err) {
    const { jobId, userId } = job.data;
    
    logger.error(`Job ${jobId} failed permanently:`, err);
    
    this.websocket.sendToUser(userId, {
      type: 'processing_error',
      jobId,
      status: 'failed',
      error: err.message,
      final: true
    });
  }
}

module.exports = AIWorker;