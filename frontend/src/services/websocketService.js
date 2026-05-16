// WebSocket client service for real-time notifications
// Manages Socket.IO connection and events

import { io } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (!token) {
      console.error('Cannot connect to WebSocket: No token provided');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.connecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    // Disconnect existing connection before creating a new one
    if (this.socket && this.connected) {
      console.log('WebSocket already connected, skipping duplicate connection');
      return;
    }

    // Clean up any existing connection first
    if (this.socket) {
      console.log('Cleaning up existing WebSocket connection');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }

    this.connecting = true;

    const serverUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:9801';
    console.log('Creating new WebSocket connection to:', serverUrl);
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      forceNew: true // Force new connection to prevent duplicates
    });

    this.setupEventListeners();
    this.connecting = false;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.connected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.connected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.connected = false;
      this.emit('error', error);
    });

    this.socket.on('connected', (data) => {
      console.log('✅ WebSocket server response:', data);
    });

    // Listen for authentication events
    this.socket.on('authenticated', () => {
      console.log('✅ WebSocket authenticated successfully');
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ WebSocket authentication failed:', error);
    });

    // Handle new notifications
    this.socket.on('notification:new', (notification) => {
      console.log('📬 Received new notification:', {
        id: notification.id,
        title: notification.title,
        type: notification.type,
        deliveryInfo: notification.deliveryInfo,
        timestamp: notification.timestamp,
        fullNotification: notification
      });
      
      // Send delivery confirmation back to server
      if (notification.id) {
        this.socket.emit('notification:delivered', {
          notificationId: notification.id,
          receivedAt: new Date().toISOString(),
          userId: notification.deliveryInfo?.targetUserId
        });
        console.log('📨 Sent delivery confirmation for notification:', notification.id);
      }
      
      this.emit('notification:new', notification);
    });

    // Handle broadcast notifications
    this.socket.on('notification:broadcast', (notification) => {
      console.log('📢 Received broadcast notification:', notification);
      this.emit('notification:broadcast', notification);
    });

    // Generic message handler
    this.socket.on('message', (data) => {
      console.log('📨 WebSocket message received:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.connecting = false;
    this.listeners.clear();
    this.emit('disconnected', 'manual_disconnect');
  }

  // Send notification acknowledgment
  markNotificationRead(notificationId) {
    if (this.socket && this.connected) {
      this.socket.emit('notification:read', notificationId);
    }
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }

  // Reconnect manually
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;