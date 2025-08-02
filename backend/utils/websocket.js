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
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      logger.info(`User ${userId} connected via WebSocket`, { socketId: socket.id });

      // Store user-socket mapping
      this.userSockets.set(userId, socket.id);
      this.socketUsers.set(socket.id, userId);

      // Join user-specific room
      socket.join(`user:${userId}`);

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
      this.io.to(`user:${userId}`).emit('message', message);
      logger.debug(`Message sent to user ${userId}:`, { type: message.type });
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