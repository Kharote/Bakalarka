// Notification controller
// Handle notification management logic

import { Notification, User, Project, Task } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import { sendNotificationToUser } from '../services/websocketService.js';

// Get user notifications
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const whereClause = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Get unread count
    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      notifications: notifications.rows.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.isRead,
        priority: notif.priority,
        icon: notif.icon,
        color: notif.color,
        relatedId: notif.relatedId,
        relatedType: notif.relatedType,
        data: notif.data,
        createdAt: notif.createdAt,
        timeAgo: getTimeAgo(notif.createdAt)
      })),
      pagination: {
        total: notifications.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(notifications.count / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.update({ isRead: true });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

// Clear all notifications for user
export const clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const deletedCount = await Notification.destroy({
      where: { userId }
    });

    res.json({
      success: true,
      message: `Cleared ${deletedCount} notifications`,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// Create notification (internal function)
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  priority = 'normal'
}) => {
  try {
    const iconMap = {
      task_assigned: { icon: 'pi pi-check-square', color: '#10B981' },
      task_completed: { icon: 'pi pi-check', color: '#059669' },
      project_invitation: { icon: 'pi pi-users', color: '#3B82F6' },
      deadline_approaching: { icon: 'pi pi-exclamation-triangle', color: '#F59E0B' },
      team_member_joined: { icon: 'pi pi-user-plus', color: '#8B5CF6' },
      project_updated: { icon: 'pi pi-refresh', color: '#6366F1' }
    };

    const { icon, color } = iconMap[type] || { icon: 'pi pi-info-circle', color: '#3B82F6' };

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedId,
      relatedType,
      priority,
      icon,
      color
    });

    // Send real-time notification
    const notificationData = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      priority: notification.priority,
      icon: notification.icon,
      color: notification.color,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      createdAt: notification.createdAt,
      timeAgo: getTimeAgo(notification.createdAt)
    };

    sendNotificationToUser(userId, notificationData);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Test notification endpoint (development only)
export const createTestNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    const notification = await createNotification({
      userId,
      type,
      title,
      message,
      priority: 'normal'
    });

    res.json({
      success: true,
      message: 'Test notification created and sent',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Utility function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return new Date(date).toLocaleDateString();
}