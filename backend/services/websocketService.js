// WebSocket service for real-time notifications
// Handles Socket.IO connections and events

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

let io;
const connectedUsers = new Map(); // Map userId to socket.id

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Ping/pong mechanizmus pre udržanie spojenia pri neaktivite
    pingInterval: 25000,  // Interval medzi ping správami (25s)
    pingTimeout: 20000    // Timeout na pong odpoveď (20s)
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('[ERROR] WebSocket auth failed: No token provided');
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        console.error('[ERROR] WebSocket auth failed: User not found for ID:', decoded.id);
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      console.log(`WebSocket authenticated user: ${user.id} (${user.email})`);
      next();
    } catch (error) {
      console.error('[ERROR] WebSocket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    console.log(`User ${userId} connected via WebSocket (socket: ${socket.id})`);
    
    // Store the connection
    connectedUsers.set(userId, socket.id);
    
    // Join user to their personal room
    socket.join(`user:${userId}`);
    
    // Send authentication success
    socket.emit('authenticated', {
      userId: userId,
      message: 'Authentication successful'
    });
    
    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to notification service',
      userId: userId,
      socketId: socket.id
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
      connectedUsers.delete(userId);
    });

    // Handle notification acknowledgment
    socket.on('notification:read', (notificationId) => {
      console.log(`User ${userId} read notification ${notificationId}`);
    });

    // Handle delivery confirmation
    socket.on('notification:delivered', (data) => {
      console.log(`Notification delivery confirmed by user ${userId}:`, {
        notificationId: data.notificationId,
        receivedAt: data.receivedAt,
        deliveryLatency: data.receivedAt ? new Date() - new Date(data.receivedAt) : 'unknown'
      });
    });

    // Test event for debugging
    socket.on('test', (data) => {
      console.log(`[DEBUG] Test event from user ${userId}:`, data);
      socket.emit('test:response', { received: data, timestamp: new Date().toISOString() });
    });
  });

  return io;
};

// Send notification to specific user
export const sendNotificationToUser = (userId, notification) => {
  if (!io) {
    console.error('[ERROR] Cannot send notification: WebSocket not initialized');
    return false;
  }

  const isUserConnected = connectedUsers.has(userId);
  const socketId = connectedUsers.get(userId);
  
  console.log(`Attempting to send notification to user ${userId}:`, {
    title: notification.title,
    type: notification.type,
    isUserConnected,
    socketId,
    totalConnectedUsers: connectedUsers.size,
    connectedUserIds: Array.from(connectedUsers.keys())
  });

  if (isUserConnected) {
    // Send to user's personal room
    const roomName = `user:${userId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
    
    console.log(`Targeting room '${roomName}' with ${clientsInRoom ? clientsInRoom.size : 0} clients`);
    
    io.to(roomName).emit('notification:new', {
      ...notification,
      timestamp: new Date().toISOString(),
      deliveryInfo: {
        targetUserId: userId,
        roomName,
        socketId,
        sentAt: new Date().toISOString()
      }
    });
    
    console.log(`Successfully sent real-time notification to user ${userId} (socket: ${socketId})`);
    return true;
  } else {
    console.log(`[WARN] User ${userId} not connected - notification saved to DB but won't be delivered in real-time`);
    console.log(`Currently connected users: [${Array.from(connectedUsers.keys()).join(', ')}]`);
    return false;
  }
};

// Send notification to multiple users
export const sendNotificationToUsers = (userIds, notification) => {
  if (!io) {
    console.error('[ERROR] Cannot send notifications: WebSocket not initialized');
    return;
  }

  const connectedCount = userIds.filter(id => connectedUsers.has(id)).length;
  console.log(`Sending notification to ${userIds.length} users (${connectedCount} connected):`, notification.title);

  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit('notification:new', notification);
  });
  
  console.log(`Sent real-time notification to ${userIds.length} users`);
};

// Broadcast notification to all connected users
export const broadcastNotification = (notification) => {
  if (!io) {
    console.error('[ERROR] Cannot broadcast notification: WebSocket not initialized');
    return;
  }

  const connectedCount = connectedUsers.size;
  console.log(`Broadcasting notification to all ${connectedCount} connected users:`, notification.title);
  
  io.emit('notification:broadcast', notification);
  console.log('Broadcasted notification to all connected users');
};

// Get connected users count
export const getConnectedUsersCount = () => {
  return connectedUsers.size;
};

// Check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

export default {
  initializeWebSocket,
  sendNotificationToUser,
  sendNotificationToUsers,
  broadcastNotification,
  getConnectedUsersCount,
  isUserOnline
};