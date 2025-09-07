const logger = require('../utils/logger');

let io = null;

/**
 * WebSocket 서버 초기화
 * @param {Socket.IO} socketIO - Socket.IO 인스턴스
 */
function initializeWebSocket(socketIO) {
  io = socketIO;

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // 작업 룸 참여
    socket.on('join-job', (data) => {
      const { jobId } = data;
      if (jobId) {
        socket.join(`job-${jobId}`);
        logger.info(`Socket ${socket.id} joined job room: job-${jobId}`);
        
        socket.emit('joined-job', { 
          jobId, 
          message: '작업 상태 업데이트를 받을 준비가 완료되었습니다.' 
        });
      }
    });

    // 작업 룸 떠나기
    socket.on('leave-job', (data) => {
      const { jobId } = data;
      if (jobId) {
        socket.leave(`job-${jobId}`);
        logger.info(`Socket ${socket.id} left job room: job-${jobId}`);
      }
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // 오류 처리
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // 핑/퐁 처리
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  logger.info('WebSocket server initialized');
}

/**
 * 작업 진행률 업데이트 전송
 * @param {string} jobId - 작업 ID
 * @param {string} stage - 현재 단계
 * @param {number} progress - 진행률 (0-100)
 * @param {string} message - 상태 메시지
 */
function emitJobProgress(jobId, stage, progress, message = '') {
  if (!io) {
    logger.warn('WebSocket not initialized');
    return;
  }

  const data = {
    jobId,
    stage,
    progress: Math.round(progress),
    message,
    timestamp: Date.now()
  };

  io.to(`job-${jobId}`).emit('job:progress', data);
  logger.info(`Job progress emitted for ${jobId}: ${progress}% - ${stage}`);
}

/**
 * 작업 완료 알림 전송
 * @param {string} jobId - 작업 ID
 * @param {Object} results - 결과 데이터
 */
function emitJobComplete(jobId, results) {
  if (!io) {
    logger.warn('WebSocket not initialized');
    return;
  }

  const data = {
    jobId,
    results,
    completedAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  io.to(`job-${jobId}`).emit('job:complete', data);
  logger.info(`Job completion emitted for ${jobId}`);
}

/**
 * 작업 오류 알림 전송
 * @param {string} jobId - 작업 ID
 * @param {string|Error} error - 오류 정보
 * @param {string} stage - 오류 발생 단계
 */
function emitJobError(jobId, error, stage = '') {
  if (!io) {
    logger.warn('WebSocket not initialized');
    return;
  }

  const errorMessage = error instanceof Error ? error.message : error;
  
  const data = {
    jobId,
    error: errorMessage,
    stage,
    failedAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  io.to(`job-${jobId}`).emit('job:error', data);
  logger.error(`Job error emitted for ${jobId}: ${errorMessage}`);
}

/**
 * 특정 클라이언트에게 메시지 전송
 * @param {string} socketId - Socket ID
 * @param {string} event - 이벤트 이름
 * @param {Object} data - 전송할 데이터
 */
function emitToClient(socketId, event, data) {
  if (!io) {
    logger.warn('WebSocket not initialized');
    return;
  }

  io.to(socketId).emit(event, data);
  logger.info(`Message sent to client ${socketId}: ${event}`);
}

/**
 * 모든 클라이언트에게 브로드캐스트
 * @param {string} event - 이벤트 이름
 * @param {Object} data - 전송할 데이터
 */
function broadcast(event, data) {
  if (!io) {
    logger.warn('WebSocket not initialized');
    return;
  }

  io.emit(event, data);
  logger.info(`Broadcast sent: ${event}`);
}

/**
 * 연결된 클라이언트 수 조회
 * @returns {number} 연결된 클라이언트 수
 */
function getConnectedClients() {
  if (!io) return 0;
  return io.engine.clientsCount || 0;
}

/**
 * 특정 룸의 클라이언트 수 조회
 * @param {string} roomName - 룸 이름
 * @returns {number} 룸의 클라이언트 수
 */
function getRoomClients(roomName) {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? room.size : 0;
}

/**
 * WebSocket 상태 정보 조회
 * @returns {Object} 상태 정보
 */
function getStatus() {
  if (!io) {
    return {
      initialized: false,
      connectedClients: 0,
      rooms: []
    };
  }

  const rooms = Array.from(io.sockets.adapter.rooms.keys())
    .filter(room => room.startsWith('job-'))
    .map(room => ({
      name: room,
      clients: getRoomClients(room)
    }));

  return {
    initialized: true,
    connectedClients: getConnectedClients(),
    rooms,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initializeWebSocket,
  emitJobProgress,
  emitJobComplete,
  emitJobError,
  emitToClient,
  broadcast,
  getConnectedClients,
  getRoomClients,
  getStatus
};