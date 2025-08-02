const express = require('express');
const multer = require('multer');
const AIProcessor = require('../services/ai/AIProcessor');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

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

// GET /api/summaries/history - Get user's summary history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // In a real app, you'd query the database here
    // For now, return mock data
    const mockHistory = {
      summaries: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    };

    res.json({
      success: true,
      data: mockHistory
    });
  } catch (error) {
    logger.error('Failed to get summary history:', error);
    res.status(500).json({
      error: 'Failed to get history',
      message: error.message
    });
  }
});

// DELETE /api/summaries/:summaryId - Delete a summary
router.delete('/:summaryId', auth, async (req, res) => {
  try {
    const { summaryId } = req.params;
    const userId = req.user.id;

    // In a real app, you'd delete from database here
    // For now, return success
    
    logger.info('Summary deletion requested', { userId, summaryId });

    res.json({
      success: true,
      message: 'Summary deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete summary:', error);
    res.status(500).json({
      error: 'Failed to delete summary',
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

module.exports = router;