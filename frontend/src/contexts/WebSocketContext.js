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
  const [jobSubscriptions, setJobSubscriptions] = useState(new Map());
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Always initialize socket, regardless of user login status
    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]); // Still watch user changes to update token

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    // Allow connection even without token

    // Determine the correct WebSocket URL based on current location
    let socketUrl;
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development
      socketUrl = 'http://localhost:5000';
    } else {
      // Production - use relative path for same origin
      socketUrl = '';
    }
    
    console.log('Connecting to WebSocket at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: {
        token: token || '' // Send empty string if no token
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

    // Handle job-specific updates
    newSocket.on('job:progress', (data) => {
      console.log('Received job:progress event:', data);
      const { jobId, progress, message } = data;
      handleJobUpdate(jobId, { type: 'progress', progress, message });
    });

    newSocket.on('job:complete', (data) => {
      console.log('Received job:complete event:', data);
      const { jobId, summaryId, result } = data;
      handleJobUpdate(jobId, { type: 'complete', summaryId, result });
    });

    newSocket.on('job:error', (data) => {
      console.log('Received job:error event:', data);
      const { jobId, error } = data;
      handleJobUpdate(jobId, { type: 'error', error });
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
      // Always attempt to reconnect, regardless of user status
      initializeSocket();
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

  const handleJobUpdate = (jobId, update) => {
    const callbacks = jobSubscriptions.get(jobId);
    if (callbacks && callbacks.length > 0) {
      callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in job update callback:', error);
        }
      });
    }

    // Add notification for job updates
    if (update.type === 'complete') {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Summary Ready',
        message: 'Your content summary is ready to view!',
        timestamp: new Date(),
        action: { type: 'navigate', summaryId: update.summaryId }
      });
    } else if (update.type === 'error') {
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Processing Failed',
        message: update.error || 'An error occurred during processing',
        timestamp: new Date(),
      });
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

  const subscribe = (event, callback) => {
    if (event.startsWith('job:')) {
      const jobId = event.split(':')[1];
      setJobSubscriptions(prev => {
        const newMap = new Map(prev);
        const callbacks = newMap.get(jobId) || [];
        callbacks.push(callback);
        newMap.set(jobId, callbacks);
        return newMap;
      });
    }
  };

  const unsubscribe = (event, callback) => {
    if (event.startsWith('job:')) {
      const jobId = event.split(':')[1];
      setJobSubscriptions(prev => {
        const newMap = new Map(prev);
        const callbacks = newMap.get(jobId) || [];
        const filtered = callbacks.filter(cb => cb !== callback);
        if (filtered.length === 0) {
          newMap.delete(jobId);
        } else {
          newMap.set(jobId, filtered);
        }
        return newMap;
      });
    }
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
    subscribe,
    unsubscribe,
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