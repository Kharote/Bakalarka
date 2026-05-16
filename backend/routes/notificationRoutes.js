// Notification routes
// Handle notification-related endpoints

import express from 'express';
import { 
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createTestNotification
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get user notifications
router.get('/', getNotifications);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Clear all notifications
router.delete('/', clearAllNotifications);

// Test endpoint to create a notification (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', createTestNotification);
}

export default router;