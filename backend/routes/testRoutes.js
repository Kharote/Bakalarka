// Test routes for development and debugging
import { Router } from 'express';
import { sendNotificationToUser } from '../services/websocketService.js';

const router = Router();

// Test endpoint to send WebSocket notifications
router.post('/send-notification', (req, res) => {
  try {
    const { userId, notification } = req.body;
    
    if (!userId || !notification) {
      return res.status(400).json({
        success: false,
        message: 'Missing userId or notification data'
      });
    }

    console.log(`🧪 Test API: Sending notification to user ${userId}:`, notification.title);
    
    const wsResult = sendNotificationToUser(userId, notification);
    
    res.json({
      success: true,
      message: wsResult ? 
        `WebSocket notification sent successfully to user ${userId}` : 
        `User ${userId} not connected - notification not delivered in real-time`,
      websocketDelivered: wsResult
    });
    
  } catch (error) {
    console.error('❌ Test API error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;