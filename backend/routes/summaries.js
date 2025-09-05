const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AIProcessor = require('../services/ai/AIProcessor');
const GeminiService = require('../services/ai/GeminiService');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const logger = require('../utils/logger');
const db = require('../models');
const StorageService = require('../services/StorageService');
const YouTubeService = require('../services/YouTubeService');
const websocket = require('../utils/websocket');
const router = express.Router();

// Initialize services
const youtubeService = new YouTubeService();
const geminiService = new GeminiService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'video/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

const aiProcessor = new AIProcessor();

// POST /api/summaries/upload - Upload and process file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { provider = 'gemini' } = req.body;
    const userId = req.user.id;

    logger.info('File upload received', {
      userId,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      provider
    });

    // Start AI processing
    const result = await aiProcessor.processContent(req.file, {
      provider,
      contentType: req.file.mimetype,
      userId
    });

    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    logger.error('File upload failed:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// GET /api/summaries/job/:jobId - Get job status
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const status = await aiProcessor.getJobStatus(jobId);
    
    // Basic security check - ensure user can only access their own jobs
    // In a real app, you'd store job ownership in database
    
    res.json({
      success: true,
      job: status
    });
  } catch (error) {
    logger.error(`Failed to get job status for ${req.params.jobId}:`, error);
    res.status(404).json({
      error: 'Job not found',
      message: error.message
    });
  }
});

// POST /api/summaries/process-url - Process URL content (public endpoint)
router.post('/process-url', optionalAuth, async (req, res) => {
  try {
    const { url, provider = 'gemini', apiKey, email } = req.body;
    const userId = req.user?.id || null;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate YouTube URL
    const youtubeVideoId = youtubeService.extractVideoId(url);
    if (!youtubeVideoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    logger.info('YouTube processing requested', { userId, url, provider, email });

    // Get video info
    const videoInfo = await youtubeService.getVideoInfo(youtubeVideoId);
    
    // Get active system prompts
    const systemPrompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['orderIndex', 'ASC']]
    });

    // Create job
    const job = await db.Job.create({
      userId: userId || null,
      type: 'url',
      status: 'processing',
      progress: 0,
      data: {
        url,
        provider,
        email
      },
      metadata: {
        url,
        provider,
        email,
        videoInfo
      }
    });

    // Create summary record
    const summary = await db.Summary.create({
      userId: userId || null,
      title: videoInfo.title,
      originalContent: url,
      summaryContent: '',
      input_type: 'youtube',
      input_content: videoInfo.transcript || url,
      provider,
      model: provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-3.5-turbo',
      sourceUrl: url,
      metadata: videoInfo,
      status: 'processing'
    });

    // Process with each system prompt
    const results = [];
    for (const prompt of systemPrompts) {
      try {
        const result = await youtubeService.generateSummary(youtubeVideoId, prompt.promptText);
        results.push({
          promptId: prompt.id,
          promptName: prompt.name,
          category: prompt.category,
          content: result
        });
      } catch (error) {
        logger.error(`Failed to process with prompt ${prompt.name}:`, error);
        results.push({
          promptId: prompt.id,
          promptName: prompt.name,
          category: prompt.category,
          content: '',
          error: error.message
        });
      }
    }

    // Update summary with results
    await summary.update({
      summaryContent: JSON.stringify(results),
      status: 'completed'
    });

    // Update job
    await job.update({
      status: 'completed',
      progress: 100,
      completedAt: new Date()
    });

    // Emit WebSocket event
    if (websocket.io) {
      websocket.io.emit('job:complete', {
        jobId: job.id,
        summaryId: summary.id,
        result: results
      });
    }

    res.json({
      success: true,
      jobId: job.id,
      summaryId: summary.id,
      results,
      videoInfo
    });
  } catch (error) {
    logger.error('YouTube processing failed:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
});

// POST /api/summaries/url - Process URL content
router.post('/url', auth, async (req, res) => {
  try {
    const { url, provider = 'gemini' } = req.body;
    const userId = req.user.id;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    logger.info('URL processing requested', { userId, url, provider });

    // Extract content from URL
    const contentExtractor = aiProcessor.contentExtractor;
    const extractedContent = await contentExtractor.extractFromURL(url);
    
    // Create mock file data for processing
    const mockFile = {
      originalname: `webpage_${Date.now()}.html`,
      size: extractedContent.text.length,
      mimetype: 'text/html',
      buffer: Buffer.from(extractedContent.text)
    };

    const result = await aiProcessor.processContent(mockFile, {
      provider,
      contentType: 'text/html',
      userId
    });

    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: result.message,
      extractedTitle: extractedContent.metadata?.title
    });
  } catch (error) {
    logger.error('URL processing failed:', error);
    res.status(500).json({
      error: 'URL processing failed',
      message: error.message
    });
  }
});

// GET /api/summaries - Get user's summaries with filtering
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search,
      sourceType,
      provider,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { userId };

    // Build where clause
    if (search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { summaryContent: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    if (sourceType) where.sourceType = sourceType.split(',');
    if (provider) where.provider = provider.split(',');
    if (status) {
      const jobs = await db.Job.findAll({
        where: { status: status.split(',') },
        attributes: ['id']
      });
      where.jobId = jobs.map(j => j.id);
    }

    // Query summaries
    const { count, rows: summaries } = await db.Summary.findAndCountAll({
      where,
      include: [
        {
          model: db.Job,
          as: 'job',
          attributes: ['status', 'progress', 'createdAt']
        },
        {
          model: db.File,
          as: 'files',
          attributes: ['id', 'originalName', 'size', 'mimeType']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        summaries,
        totalCount: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to get summaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summaries'
    });
  }
});

// GET /api/summaries/stats - Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get statistics
    const [totalSummaries, thisWeek, avgProcessingTime, successCount] = await Promise.all([
      db.Summary.count({ where: { userId } }),
      db.Summary.count({
        where: {
          userId,
          createdAt: { [db.Sequelize.Op.gte]: oneWeekAgo }
        }
      }),
      db.Summary.aggregate('processingTime', 'avg', { where: { userId } }),
      db.Summary.count({
        where: { userId },
        include: [{
          model: db.Job,
          as: 'job',
          where: { status: 'completed' }
        }]
      })
    ]);

    const successRate = totalSummaries > 0 ? Math.round((successCount / totalSummaries) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalSummaries,
        thisWeek,
        processingTime: Math.round((avgProcessingTime || 0) / 1000),
        successRate
      }
    });
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// GET /api/summaries/:id - Get summary details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await db.Summary.findOne({
      where: { id, userId },
      include: [
        {
          model: db.Job,
          as: 'job',
          attributes: ['status', 'progress', 'error', 'startedAt', 'completedAt']
        },
        {
          model: db.File,
          as: 'files',
          attributes: ['id', 'originalName', 'size', 'mimeType', 'storageUrl']
        }
      ]
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    // Increment view count
    await summary.increment('viewCount');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summary'
    });
  }
});

// PUT /api/summaries/:id - Update summary
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, tags } = req.body;

    const summary = await db.Summary.findOne({ where: { id, userId } });
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    // Update allowed fields
    if (title) summary.title = title;
    if (tags) summary.tags = tags;

    await summary.save();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to update summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update summary'
    });
  }
});

// DELETE /api/summaries/:id - Delete a summary
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await db.Summary.findOne({
      where: { id, userId },
      include: [{ model: db.File, as: 'files' }]
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    // Delete associated files from storage
    for (const file of summary.files) {
      if (file.storageUrl) {
        try {
          const fileName = path.basename(file.storageUrl);
          await StorageService.deleteFile(fileName);
        } catch (error) {
          logger.warn('Failed to delete file from storage:', error);
        }
      }
    }

    // Delete from database
    await summary.destroy();

    res.json({
      success: true,
      message: 'Summary deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete summary'
    });
  }
});

// PUT /api/summaries/:id/rating - Rate a summary
router.put('/:id/rating', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const summary = await db.Summary.findOne({ where: { id, userId } });
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    summary.rating = rating;
    await summary.save();

    res.json({
      success: true,
      data: { rating: summary.rating }
    });
  } catch (error) {
    logger.error('Failed to rate summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate summary'
    });
  }
});

// POST /api/summaries/:id/share - Generate share link
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await db.Summary.findOne({ where: { id, userId } });
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    // Generate share token if not exists
    if (!summary.shareToken) {
      summary.generateShareToken();
      await summary.save();
    }

    summary.isPublic = true;
    await summary.save();

    res.json({
      success: true,
      data: {
        shareToken: summary.shareToken,
        shareUrl: `${process.env.FRONTEND_URL}/share/${summary.shareToken}`
      }
    });
  } catch (error) {
    logger.error('Failed to generate share link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share link'
    });
  }
});

// PUT /api/summaries/:id/title - Update summary title
router.put('/:id/title', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const summary = await db.Summary.findOne({ where: { id, userId } });
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    summary.title = title.trim();
    await summary.save();

    res.json({
      success: true,
      data: {
        id: summary.id,
        title: summary.title
      }
    });
  } catch (error) {
    logger.error('Failed to update title:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update title'
    });
  }
});

// GET /api/summaries/:id/download - Download summary as PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const summary = await db.Summary.findOne({ where: { id, userId } });
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found'
      });
    }

    // In a real app, you'd generate a PDF here
    // For now, return the summary content as text
    const content = `Title: ${summary.title}\n\nSummary:\n${summary.summaryContent}\n\nKey Points:\n${summary.keyPoints?.join('\n- ') || 'None'}`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${summary.title}.txt"`);
    res.send(content);
  } catch (error) {
    logger.error('Failed to download summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download summary'
    });
  }
});

// POST /api/summaries/process - Process content (YouTube, URL, etc.)
// Note: This endpoint allows both authenticated and unauthenticated requests
router.post('/process', optionalAuth, async (req, res) => {
  try {
    const { url, email, apiKey, inputType = 'youtube' } = req.body;
    const userId = req.user?.id || null;
    
    // API 키 처리 - 사용자가 제공한 키가 있으면 사용
    if (apiKey) {
      // 임시로 환경변수에 설정 (실제로는 요청별로 처리해야 함)
      process.env.TEMP_GEMINI_KEY = apiKey;
    }
    
    if (inputType === 'youtube') {
      // YouTube URL 처리 로직
      const videoId = youtubeService.extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid YouTube URL'
        });
      }
      
      // 시스템 프롬프트 가져오기
      const systemPrompts = await db.SystemPrompt.findAll({
        where: { isActive: true },
        order: [['orderIndex', 'ASC']]
      });
      
      // 6개의 프롬프트로 처리
      const results = [];
      for (const prompt of systemPrompts) {
        try {
          // YouTube 자막 추출
          const subtitleData = await youtubeService.extractTimestampedSubtitles(videoId);
          
          if (subtitleData.hasSubtitles && subtitleData.fullText) {
            // Gemini로 처리
            const result = await geminiService.processText(
              subtitleData.fullText,
              { 
                systemPrompt: prompt.promptText,
                apiKey: apiKey || process.env.GEMINI_API_KEY
              }
            );
            
            results.push({
              promptName: prompt.name,
              content: result.content || result
            });
          } else {
            results.push({
              promptName: prompt.name,
              content: '자막을 추출할 수 없습니다.'
            });
          }
        } catch (error) {
          console.error(`Error processing with prompt ${prompt.name}:`, error);
          results.push({
            promptName: prompt.name,
            content: '처리 중 오류가 발생했습니다.'
          });
        }
      }
      
      // 이메일 전송
      if (email) {
        try {
          const EmailService = require('../services/EmailService');
          await EmailService.sendSummaryEmail(email, {
            title: `YouTube 동영상 요약`,
            url: url,
            results: results.reduce((acc, result, index) => {
              acc[result.promptName || `결과 ${index + 1}`] = result.content;
              return acc;
            }, {})
          }, systemPrompts);
          
          logger.info(`Summary email sent to ${email}`);
        } catch (emailError) {
          logger.error('Failed to send email:', emailError);
          // 이메일 전송 실패해도 결과는 반환
        }
      }
      
      return res.json({
        success: true,
        results: results
      });
    }
    
    // 다른 inputType 처리 (향후 구현)
    return res.status(400).json({
      success: false,
      error: `Unsupported input type: ${inputType}`
    });
    
  } catch (error) {
    console.error('Processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Processing failed'
    });
  }
});

// POST /api/summaries/youtube - Process YouTube URL (with background processing)
// Note: This endpoint allows both authenticated and unauthenticated requests
router.post('/youtube', optionalAuth, async (req, res) => {
  try {
    const { url, email, background } = req.body;
    // Optional auth - get userId if authenticated
    const userId = req.user?.id || null;
    const backgroundProcessing = req.body.background !== false; // Default to background processing
    
    logger.info('YouTube processing started', { url, email, userId, backgroundProcessing });
    
    // Extract video ID
    const videoId = youtubeService.extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL'
      });
    }
    
    // Always create a Job record in database for tracking
    const jobId = require('uuid').v4();
    
    // For anonymous users, create a temporary userId
    const effectiveUserId = userId || `anonymous_${require('uuid').v4()}`;
    
    // Create job record in database
    // const jobRecord = await db.Job.create({
    //   id: jobId,
    //   userId: effectiveUserId,
    //   type: 'url',
    //   status: 'processing',
    //   progress: 0,
    //   input: {
    //     url,
    //     videoId,
    //     email
    //   },
    //   options: {
    //     provider: 'gemini',
    //     model: 'gemini-1.5-flash',
    //     sourceType: 'youtube'
    //   },
    //   startedAt: new Date()
    // });
    
    // Mock job record for testing
    const jobRecord = {
      id: jobId,
      updateProgress: async (progress, message) => {
        console.log(`📊 Progress: ${progress}% - ${message}`);
      },
      markAsCompleted: async (result) => {
        console.log('✅ Job completed:', Object.keys(result));
      },
      startedAt: new Date()
    };
    
    logger.info('Job record created', { jobId, videoId, userId: effectiveUserId });
    
    // Send initial WebSocket update (only if user is authenticated)
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'processing',
        progress: 0,
        message: 'Starting YouTube video processing...'
      });
    }
    
    // If background processing is enabled, use the job queue
    if (backgroundProcessing) {
      // Queue the YouTube processing job
      const job = await aiProcessor.queueService.addJob('youtube-processing', {
        jobId,
        videoId,
        url,
        userId,
        email,
        timestamp: new Date().toISOString()
      });
      
      logger.info('YouTube processing queued', { jobId, videoId, userId });
      
      // Return immediately with job ID
      return res.json({
        success: true,
        jobId,
        status: 'processing',
        message: 'YouTube video processing started in background'
      });
    }
    
    // Otherwise, process synchronously (for backward compatibility)
    logger.info('Processing YouTube video synchronously', { videoId, userId, email });
    
    // Get video info
    logger.info('Getting video info...');
    await jobRecord.updateProgress(10, 'Getting video information...');
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'getting_video_info',
        progress: 10,
        message: 'Getting video information...'
      });
    }
    
    const videoInfo = await youtubeService.getVideoInfo(videoId);
    logger.info('Video info retrieved', { title: videoInfo?.title });
    
    // Extract subtitles/transcript
    logger.info('Extracting subtitles...');
    await jobRecord.updateProgress(30, 'Extracting subtitles...');
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'extracting_subtitles',
        progress: 30,
        message: 'Extracting subtitles...'
      });
    }
    
    const subtitleData = await youtubeService.extractTimestampedSubtitles(videoId);
    logger.info('Subtitles extracted', { hasSubtitles: subtitleData?.hasSubtitles, textLength: subtitleData?.fullText?.length });
    
    if (!subtitleData.hasSubtitles || !subtitleData.fullText) {
      // If no subtitles, generate summary directly from video but apply all prompts
      logger.info('No subtitles found, processing video directly with system prompts');
      
      // Get system prompts
      let systemPrompts = [];
      try {
        systemPrompts = await db.SystemPrompt.findAll({
          where: { isActive: true },
          order: [['orderIndex', 'ASC']]
        });
        console.log('✅ Loaded system prompts for video without subtitles:', systemPrompts.map(p => ({ name: p.name, category: p.category })));
      } catch (error) {
        console.error('❌ Failed to load system prompts:', error);
        logger.warn('Failed to load system prompts, using defaults', error);
      }
      
      // Use default prompts if none in database
      if (systemPrompts.length === 0) {
        console.log('⚠️ No system prompts in DB, using defaults');
        systemPrompts = [
          { 
            id: 1, 
            name: 'Summary', 
            category: 'summary', 
            prompt: 'Please summarize this YouTube video in a clear and concise way.' 
          }
        ];
      }
      
      console.log(`📋 Processing video without subtitles with ${systemPrompts.length} prompts:`, systemPrompts.map(p => p.name));
      
      const results = {};
      let progressIncrement = 40 / systemPrompts.length;
      let currentProgress = 50;
      
      for (const prompt of systemPrompts) {
        try {
          logger.info(`Processing video with prompt: ${prompt.name} (${prompt.category})`);
          
          // Update progress
          currentProgress += progressIncrement;
          await jobRecord.updateProgress(Math.min(90, Math.round(currentProgress)), `Processing: ${prompt.name}...`);
          if (userId) {
            websocket.sendToUser(userId, {
              type: 'job:progress',
              jobId,
              status: 'processing_with_ai',
              progress: Math.min(90, Math.round(currentProgress)),
              message: `Processing: ${prompt.name}...`
            });
          }
          
          // Generate summary from video with the prompt
          const summary = await youtubeService.generateSummary(videoId, prompt.prompt);
          
          if (summary) {
            results[prompt.category] = {
              name: prompt.name,
              content: summary
            };
            console.log(`✅ Added result for ${prompt.category}:`, prompt.name);
          }
        } catch (error) {
          logger.error(`Failed to process video with prompt ${prompt.name}:`, error);
          results[prompt.category] = {
            name: prompt.name,
            content: 'Processing failed',
            error: error.message
          };
        }
      }
      
      console.log('📊 Final results object for video without subtitles:', Object.keys(results));
      console.log('📊 Results details:', results);
      
      // Save to database if user is logged in
      let summaryRecord = null;
      // if (userId) {
      //   summaryRecord = await db.Summary.create({
      //     userId,
      //     jobId,
      //     title: videoInfo.title,
      //     originalContent: videoInfo.description,
      //     summaryContent: results.summary?.content || 'No summary available',
      //     sourceType: 'youtube',
      //     sourceUrl: url,
      //     model: 'gemini-2.0-flash',
      //     metadata: {
      //       videoId,
      //       channel: videoInfo.channel,
      //       duration: videoInfo.duration,
      //       thumbnail: videoInfo.thumbnail,
      //       results
      //     },
      //     processingTime: Date.now() - jobRecord.startedAt.getTime(),
      //     provider: 'gemini'
      //   });
      // }
      
      // Update job to completed
      await jobRecord.markAsCompleted({
        summaryId: summaryRecord?.id,
        results
      });
      
      return res.json({
        success: true,
        data: {
          videoInfo,
          results,
          summaryId: summaryRecord?.id
        }
      });
    }
    
    // Process with system prompts (or use default if none exist)
    await jobRecord.updateProgress(50, 'Processing with AI...');
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'processing_with_ai',
        progress: 50,
        message: 'Processing transcript with AI...'
      });
    }
    
    let systemPrompts = [];
    try {
      systemPrompts = await db.SystemPrompt.findAll({
        where: { isActive: true },
        order: [['orderIndex', 'ASC']]
      });
      console.log('✅ Loaded system prompts from DB:', systemPrompts.map(p => ({ name: p.name, category: p.category })));
    } catch (error) {
      console.error('❌ Failed to load system prompts:', error);
      logger.warn('Failed to load system prompts, using defaults', error);
    }
    
    // Use default prompts if none in database
    if (systemPrompts.length === 0) {
      console.log('⚠️ No system prompts in DB, using defaults');
      systemPrompts = [
        { 
          id: 1, 
          name: 'Summary', 
          category: 'summary', 
          prompt: 'Please summarize this YouTube video transcript in a clear and concise way.' 
        }
      ];
    }
    
    logger.info(`Found ${systemPrompts.length} system prompts to process`);
    console.log(`📋 Processing ${systemPrompts.length} prompts:`, systemPrompts.map(p => p.name));
    
    const results = {};
    let quotaExceeded = false;
    let progressIncrement = 40 / systemPrompts.length;
    let currentProgress = 50;
    
    for (const prompt of systemPrompts) {
      try {
        // Skip if quota exceeded
        if (quotaExceeded) {
          logger.warn(`Skipping prompt ${prompt.name} due to quota limit`);
          results[prompt.category] = {
            name: prompt.name,
            content: '일일 API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.',
            error: 'quota_exceeded'
          };
          continue;
        }
        
        logger.info(`Processing with prompt: ${prompt.name} (${prompt.category})`);
        
        // Update progress for this prompt
        currentProgress += progressIncrement;
        await jobRecord.updateProgress(Math.min(90, Math.round(currentProgress)), `Processing: ${prompt.name}...`);
        if (userId) {
          websocket.sendToUser(userId, {
            type: 'job:progress',
            jobId,
            status: 'processing_with_ai',
            progress: Math.min(90, Math.round(currentProgress)),
            message: `Processing: ${prompt.name}...`
          });
        }
        
        const result = await geminiService.processText(
          subtitleData.fullText,
          { systemPrompt: prompt.prompt }
        );
        logger.info(`Completed processing for ${prompt.name}`);
        results[prompt.category] = {
          name: prompt.name,
          content: result.content || result
        };
        console.log(`✅ Added result for ${prompt.category}:`, prompt.name);
      } catch (error) {
        logger.error(`Failed to process with prompt ${prompt.name}:`, error);
        
        // Check if it's a quota error
        if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
          quotaExceeded = true;
          results[prompt.category] = {
            name: prompt.name,
            content: '일일 API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.',
            error: 'quota_exceeded'
          };
        } else {
          results[prompt.category] = {
            name: prompt.name,
            content: '처리 중 오류가 발생했습니다.',
            error: error.message
          };
        }
      }
    }
    
    logger.info('All prompts processed, preparing response');
    console.log('📊 Final results object:', Object.keys(results));
    console.log('📊 Results details:', results);
    
    // Update job progress to 90%
    await jobRecord.updateProgress(90, 'Saving results...');
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:progress',
        jobId,
        status: 'saving',
        progress: 90,
        message: 'Saving results...'
      });
    }
    
    // Save to database if user is logged in
    let summaryRecord = null;
    // if (userId) {
    //   summaryRecord = await db.Summary.create({
    //     userId,
    //     jobId, // Link to job
    //     title: videoInfo.title,
    //     originalContent: subtitleData.fullText,
    //     summaryContent: results.summary?.content || subtitleData.fullText.substring(0, 500),
    //     keyPoints: results.keypoints?.content ? 
    //       results.keypoints.content.split('\n').filter(p => p.trim()) : [],
    //     sourceType: 'youtube',
    //     sourceUrl: url,
    //     metadata: {
    //       videoId,
    //       channel: videoInfo.channel,
    //       duration: videoInfo.duration,
    //       thumbnail: videoInfo.thumbnail,
    //       results
    //     },
    //     processingTime: Date.now() - jobRecord.startedAt.getTime(),
    //     provider: 'gemini'
    //   });
    // }
    
    // Update job to completed
    await jobRecord.markAsCompleted({
      summaryId: summaryRecord?.id,
      results
    });
    
    // Send completion via WebSocket
    if (userId) {
      websocket.sendToUser(userId, {
        type: 'job:complete',
        jobId,
        status: 'completed',
        progress: 100,
        data: {
          videoInfo,
          subtitles: subtitleData,
          results,
          summaryId: summaryRecord?.id
        }
      });
    }
    
    // Send email if provided
    if (email) {
      // TODO: Implement email sending
      logger.info('Email notification requested', { email });
    }
    
    res.json({
      success: true,
      data: {
        videoInfo,
        subtitles: subtitleData,
        results,
        summaryId: summaryRecord?.id
      }
    });
    
  } catch (error) {
    logger.error('YouTube processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process YouTube video',
      message: error.message
    });
  }
});

// GET /api/summaries/providers/test - Test AI provider connections
router.get('/providers/test', auth, async (req, res) => {
  try {
    const geminiTest = await aiProcessor.geminiService.testConnection();
    const openaiTest = await aiProcessor.openaiService.testConnection();

    res.json({
      success: true,
      providers: {
        gemini: geminiTest,
        openai: openaiTest
      }
    });
  } catch (error) {
    logger.error('Provider test failed:', error);
    res.status(500).json({
      error: 'Provider test failed',
      message: error.message
    });
  }
});

// GET /api/summaries/providers/keys - Get API keys list (admin only)
router.get('/providers/keys', auth, async (req, res) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get Gemini keys from environment
    const geminiKeys = process.env.GEMINI_API_KEYS?.split(',').map(key => key.trim()).filter(key => key) || [];
    const geminiKey = process.env.GEMINI_API_KEY;
    
    // If single key exists and not in array, add it
    if (geminiKey && !geminiKeys.includes(geminiKey)) {
      geminiKeys.unshift(geminiKey);
    }

    // Get key status from service
    const geminiStatus = aiProcessor.geminiService.getApiKeyStatus();

    // Mask keys for security (show first 10 and last 4 characters)
    const maskedKeys = geminiKeys.map((key, index) => ({
      index,
      key: key.length > 20 ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : key,
      active: index === geminiStatus.currentKeyIndex,
      usageCount: geminiStatus.keyUsage[index] || 0,
      errorCount: geminiStatus.keyErrors[index] || 0
    }));

    res.json({
      success: true,
      data: {
        gemini: {
          keys: maskedKeys,
          totalKeys: geminiKeys.length,
          currentIndex: geminiStatus.currentKeyIndex
        },
        openai: {
          hasKey: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys'
    });
  }
});

module.exports = router;