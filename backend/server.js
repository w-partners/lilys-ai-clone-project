require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const websocket = require('./utils/websocket');
const QueueService = require('./services/QueueService');
const AIWorker = require('./workers/aiWorker');
const db = require('./models');

// Import routes
const authRouter = require('./routes/auth');
const summariesRouter = require('./routes/summaries');
const promptsRouter = require('./routes/prompts');

const app = express();

// Increase header size limit to fix 431 error
const server = http.createServer({
  maxHeaderSize: 32768 // 32KB
}, app);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3003',
    'http://localhost:3003',
    'http://localhost:3000',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://34.121.104.11',
    'http://34.121.104.11:3003',
    'http://34.121.104.11:5001',
    'https://youtube.platformmakers.org',
    'http://youtube.platformmakers.org'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Trust proxy for Cloudflare/Nginx with specific configuration
app.set('trust proxy', 1); // Trust first proxy (nginx)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    verification: 'LILYS-AI-CLONE-2025-08-28'
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/usage', require('./routes/api-usage'));
app.use('/api/keys', require('./routes/apiKeys'));
app.use('/api/system-prompts', require('./routes/systemPrompts'));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  }
  
  // Serve React app
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'File size exceeds the maximum limit of 50MB'
    });
  }
  
  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({
      error: 'Unsupported file type',
      message: err.message
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Initialize services
let queueService;
let aiWorker;

async function initializeServices() {
  try {
    // Initialize database
    // Skip sync - use migrations instead
    // await db.sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('Database ready (using migrations)');
    
    // Initialize default accounts
    const initializeAccounts = require('./scripts/initializeAccounts');
    await initializeAccounts();
    logger.info('Default accounts initialized');
    
    // Initialize default prompts - DISABLED (manually manage prompts)
    // const initializePrompts = require('./scripts/initializePrompts');
    // await initializePrompts();
    // logger.info('Default prompts initialized');
    
    // Initialize queue service
    queueService = new QueueService();
    logger.info('Queue service initialized');
    
    // Initialize AI worker
    aiWorker = new AIWorker();
    
    // Set up queue processing
    queueService.aiQueue.process('ai-processing', async (job) => {
      return await aiWorker.processJob(job);
    });
    
    // Set up YouTube processing
    queueService.aiQueue.process('youtube-processing', async (job) => {
      return await aiWorker.processJob(job);
    });
    
    queueService.aiQueue.on('failed', async (job, err) => {
      await aiWorker.handleFailedJob(job, err);
    });
    
    logger.info('AI worker initialized and connected to queue');
    
    // Initialize WebSocket
    websocket.initialize(server);
    logger.info('WebSocket server initialized');
    
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  if (queueService) {
    await queueService.close();
    logger.info('Queue service closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  if (queueService) {
    await queueService.close();
    logger.info('Queue service closed');
  }
  
  process.exit(0);
});

// Start server
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize services after server starts
  await initializeServices();
  
  logger.info('🚀 Lilys.AI Clone Backend is ready!');
});

module.exports = app;