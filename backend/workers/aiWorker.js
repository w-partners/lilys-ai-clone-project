const AIProcessor = require('../services/ai/AIProcessor');
const YouTubeService = require('../services/YouTubeService');
const GeminiService = require('../services/ai/GeminiService');
const logger = require('../utils/logger');
const websocket = require('../utils/websocket');
const db = require('../models');

class AIWorker {
  constructor() {
    this.aiProcessor = new AIProcessor();
    this.youtubeService = new YouTubeService();
    this.geminiService = new GeminiService();
    this.websocket = websocket;
  }

  async processJob(job) {
    // Check if this is a YouTube processing job
    if (job.name === 'youtube-processing') {
      return this.processYouTubeJob(job);
    }
    
    // Otherwise, process as regular AI job
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

      // Save the result to database
      const db = require('../models');
      
      // Parse the summary to extract script if it's a YouTube video
      let scriptContent = null;
      if (metadata.contentType === 'youtube' || metadata.sourceUrl?.includes('youtube.com')) {
        // Extract script from the summary or metadata
        if (result.metadata?.transcript) {
          scriptContent = result.metadata.transcript;
        } else if (result.originalContent) {
          scriptContent = result.originalContent;
        }
      }
      
      // Create the summary in database
      const summary = await db.Summary.create({
        userId,
        jobId,
        title: result.metadata?.title || metadata.title || 'Untitled Summary',
        originalContent: scriptContent || content.substring(0, 5000), // Store script or first 5000 chars
        summaryContent: result.summary,
        keyPoints: result.keyPoints || [],
        metadata: {
          ...metadata,
          ...result.metadata,
          originalContent: {
            filename: metadata.originalFileName,
            size: metadata.fileSize,
            type: metadata.contentType
          }
        },
        sourceType: metadata.contentType || 'text',
        sourceUrl: metadata.sourceUrl || null,
        provider: result.provider,
        model: result.model || 'gemini-1.5-flash',
        processingTime: result.processingTime,
        cost: result.cost || 0,
        tags: result.tags || []
      });
      
      // Update job status
      await db.Job.update(
        { 
          status: 'completed',
          completedAt: new Date()
        },
        { where: { id: jobId } }
      );
      
      const finalResult = {
        jobId,
        summaryId: summary.id,
        summary: result.summary,
        script: scriptContent,
        provider: result.provider,
        tokensUsed: result.tokensUsed,
        processingTime: result.processingTime,
        metadata: summary.metadata,
        createdAt: summary.createdAt
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

  async processYouTubeJob(job) {
    const { jobId, videoId, url, userId, email } = job.data;
    
    try {
      logger.info(`Processing YouTube job ${jobId}`, { videoId, userId });
      
      // Update progress: Getting video info
      await job.progress(10);
      this.websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'getting_video_info',
        progress: 10,
        message: 'Getting video information...'
      });
      
      const videoInfo = await this.youtubeService.getVideoInfo(videoId);
      
      // Update progress: Extracting subtitles
      await job.progress(30);
      this.websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'extracting_subtitles',
        progress: 30,
        message: 'Extracting subtitles...'
      });
      
      const subtitleData = await this.youtubeService.extractTimestampedSubtitles(videoId);
      
      if (!subtitleData.hasSubtitles || !subtitleData.fullText) {
        // No subtitles available, try direct summary
        await job.progress(50);
        this.websocket.sendToUser(userId, {
          type: 'job:progress',
          jobId,
          status: 'generating_summary',
          progress: 50,
          message: 'Generating summary from video...'
        });
        
        const summary = await this.youtubeService.generateSummary(videoId);
        
        // Save to database
        const summaryRecord = await db.Summary.create({
          userId,
          jobId,
          title: videoInfo.title,
          originalContent: videoInfo.description,
          summaryContent: summary || 'Could not generate summary',
          sourceType: 'youtube',
          sourceUrl: url,
          metadata: {
            videoId,
            channel: videoInfo.channel,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail
          },
          processingTime: Date.now() - job.timestamp,
          provider: 'gemini',
          model: 'gemini-1.5-flash'
        });
        
        await job.progress(100);
        this.websocket.sendToUser(userId, {
          type: 'job:complete',
          jobId,
          status: 'completed',
          progress: 100,
          data: {
            videoInfo,
            results: {
              summary: {
                name: 'Summary',
                content: summary
              }
            },
            summaryId: summaryRecord.id
          }
        });
        
        return summaryRecord;
      }
      
      // Process with system prompts
      await job.progress(50);
      this.websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'processing_with_ai',
        progress: 50,
        message: 'Processing transcript with AI...'
      });
      
      // Get system prompts
      let systemPrompts = [];
      try {
        systemPrompts = await db.SystemPrompt.findAll({
          where: { isActive: true },
          order: [['orderIndex', 'ASC']]
        });
      } catch (error) {
        logger.warn('Failed to load system prompts, using defaults', error);
      }
      
      if (systemPrompts.length === 0) {
        systemPrompts = [
          { 
            id: 1, 
            name: 'Summary', 
            category: 'summary', 
            prompt: 'Please summarize this YouTube video transcript in a clear and concise way.' 
          }
        ];
      }
      
      const results = {};
      let progressIncrement = 40 / systemPrompts.length;
      let currentProgress = 50;
      
      for (const prompt of systemPrompts) {
        try {
          logger.info(`Processing with prompt: ${prompt.name}`);
          const result = await this.geminiService.processText(
            subtitleData.fullText,
            { systemPrompt: prompt.prompt }
          );
          
          results[prompt.category] = {
            name: prompt.name,
            content: result.content || result
          };
          
          currentProgress += progressIncrement;
          await job.progress(Math.min(90, currentProgress));
          this.websocket.sendToUser(userId, {
            type: 'job:progress',
            jobId,
            status: 'processing_with_ai',
            progress: Math.min(90, currentProgress),
            message: `Processing: ${prompt.name}...`
          });
        } catch (error) {
          logger.error(`Failed to process with prompt ${prompt.name}:`, error);
          results[prompt.category] = {
            name: prompt.name,
            content: 'Processing failed',
            error: error.message
          };
        }
      }
      
      // Save to database
      await job.progress(95);
      this.websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'saving',
        progress: 95,
        message: 'Saving results...'
      });
      
      const summaryRecord = await db.Summary.create({
        userId,
        jobId,
        title: videoInfo.title,
        originalContent: subtitleData.fullText,
        summaryContent: results.summary?.content || subtitleData.fullText.substring(0, 500),
        keyPoints: results.keypoints?.content ? 
          results.keypoints.content.split('\n').filter(p => p.trim()) : [],
        sourceType: 'youtube',
        sourceUrl: url,
        metadata: {
          videoId,
          channel: videoInfo.channel,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail,
          results
        },
        processingTime: Date.now() - job.timestamp,
        provider: 'gemini',
        model: 'gemini-1.5-flash'
      });
      
      // Update job status
      await db.Job.update(
        { 
          status: 'completed',
          completedAt: new Date()
        },
        { where: { id: jobId } }
      );
      
      await job.progress(100);
      this.websocket.sendToUser(userId, {
        type: 'job:complete',
        jobId,
        status: 'completed',
        progress: 100,
        data: {
          videoInfo,
          subtitles: subtitleData,
          results,
          summaryId: summaryRecord.id
        }
      });
      
      logger.info(`YouTube job ${jobId} completed successfully`);
      
      return summaryRecord;
    } catch (error) {
      logger.error(`YouTube job ${jobId} failed:`, error);
      
      this.websocket.sendToUser(userId, {
        type: 'job:error',
        jobId,
        status: 'failed',
        error: error.message
      });
      
      // Update job status
      await db.Job.update(
        { 
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        },
        { where: { id: jobId } }
      );
      
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