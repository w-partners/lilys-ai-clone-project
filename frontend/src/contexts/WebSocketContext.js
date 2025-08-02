import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (user) {
      initializeSocket();
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      
      // Don't attempt to reconnect if disconnection was intentional
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        return;
      }
      
      // Attempt to reconnect
      attemptReconnect();
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
      attemptReconnect();
    });

    // Handle incoming messages
    newSocket.on('message', (message) => {
      handleIncomingMessage(message);
    });

    // Handle pong responses
    newSocket.on('pong', () => {
      console.log('Received pong from server');
    });

    setSocket(newSocket);
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      toast.error('Connection lost. Please refresh the page.');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (user) {
        initializeSocket();
      }
    }, delay);
  };

  const handleIncomingMessage = (message) => {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'processing_update':
        // Handle processing progress updates
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Processing Update',
          message: `Job ${message.jobId}: ${message.status} (${message.progress}%)`,
          timestamp: new Date(),
        });
        break;
        
      case 'processing_complete':
        // Handle processing completion
        addNotification({
          id: Date.now(),
          type: 'success',
          title: 'Processing Complete',
          message: `Your content has been successfully processed!`,
          timestamp: new Date(),
        });
        toast.success('Content processing completed!');
        break;
        
      case 'processing_error':
        // Handle processing errors
        addNotification({
          id: Date.now(),
          type: 'error',
          title: 'Processing Error',
          message: message.error || 'An error occurred during processing',
          timestamp: new Date(),
        });
        toast.error('Processing failed: ' + (message.error || 'Unknown error'));
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const sendMessage = (message) => {
    if (socket && connected) {
      socket.emit('message', message);
      return true;
    }
    return false;
  };

  const requestJobStatus = (jobId) => {
    if (socket && connected) {
      socket.emit('request_job_status', { jobId });
      return true;
    }
    return false;
  };

  const pingServer = () => {
    if (socket && connected) {
      socket.emit('ping');
      return true;
    }
    return false;
  };

  const value = {
    socket,
    connected,
    notifications,
    sendMessage,
    requestJobStatus,
    pingServer,
    removeNotification,
    clearNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};