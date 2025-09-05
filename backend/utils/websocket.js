const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

class WebSocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socket.id
    this.socketUsers = new Map(); // socket.id -> userId
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'http://localhost:3003',
          'http://localhost:3003',
          'http://localhost:3000',
          'http://34.121.104.11',
          'http://34.121.104.11:3003',
          'http://34.121.104.11:5001',
          'https://youtube.platformmakers.org',
          'http://youtube.platformmakers.org'
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware - allow both authenticated and anonymous connections
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
          } catch (error) {
            logger.warn('Invalid WebSocket token, proceeding as anonymous:', error.message);
            socket.userId = null;
          }
        } else {
          socket.userId = null;
        }
        next();
      } catch (error) {
        logger.error('WebSocket middleware error:', error);
        next(new Error('Connection failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      logger.info(`User ${userId} connected via WebSocket`, { socketId: socket.id });

      // Store user-socket mapping
      if (userId) {
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);
        // Join user-specific room
        socket.join(`user:${userId}`);
      }
      
      // All sockets join a common room for anonymous users
      socket.join('anonymous');

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`User ${userId} disconnected:`, reason);
        this.userSockets.delete(userId);
        this.socketUsers.delete(socket.id);
      });

      // Handle job status requests
      socket.on('request_job_status', async (data) => {
        try {
          const { jobId } = data;
          // Here you would get job status from queue service
          // For now, we'll emit a placeholder response
          socket.emit('job_status', {
            jobId,
            status: 'processing',
            progress: 50
          });
        } catch (error) {
          logger.error('Failed to get job status:', error);
          socket.emit('job_status_error', {
            jobId: data.jobId,
            error: error.message
          });
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    logger.info('WebSocket server initialized');
    return this.io;
  }

  sendToUser(userId, message) {
    if (!this.io) {
      logger.warn('WebSocket not initialized');
      return false;
    }

    try {
      // Send to user's room if userId is provided
      if (userId) {
        this.io.to(`user:${userId}`).emit('message', message);
        
        // Also emit specific event types for backward compatibility
        if (message.type) {
          this.io.to(`user:${userId}`).emit(message.type, message);
        }
      }
      
      // Also send to anonymous room for non-authenticated users
      // This ensures messages reach users who haven't logged in
      this.io.to('anonymous').emit('message', message);
      if (message.type) {
        this.io.to('anonymous').emit(message.type, message);
      }
      
      logger.info(`Message sent to user ${userId} and anonymous:`, { type: message.type, jobId: message.jobId });
      return true;
    } catch (error) {
      logger.error(`Failed to send message to user ${userId}:`, error);
      return false;
    }
  }

  sendToAll(message) {
    if (!this.io) {
      logger.warn('WebSocket not initialized');
      return false;
    }

    try {
      this.io.emit('broadcast', message);
      logger.debug('Broadcast message sent:', { type: message.type });
      return true;
    } catch (error) {
      logger.error('Failed to send broadcast message:', error);
      return false;
    }
  }

  getUserSocketCount() {
    return this.userSockets.size;
  }

  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }

  disconnectUser(userId) {
    const socketId = this.userSockets.get(userId);
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info(`User ${userId} forcibly disconnected`);
        return true;
      }
    }
    return false;
  }

  getStats() {
    return {
      connectedUsers: this.userSockets.size,
      totalSockets: this.socketUsers.size,
      rooms: this.io ? Object.keys(this.io.sockets.adapter.rooms).length : 0
    };
  }
}

// Export singleton instance
module.exports = new WebSocketManager();