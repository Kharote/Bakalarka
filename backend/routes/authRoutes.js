// Authentication routes
// Microsoft SSO authentication only

import express from 'express';
import { 
  microsoftLogin, 
  microsoftCallback,
  logout,
  getCurrentUser,
  refreshToken,
  getProfile,
  updateProfile,
  getUserStats,
  getSettings,
  updateSettings,
  updateSetting,
  updateLocale,
  refreshUserPhoto,
  linkTeamsAccount,
  login
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Local email/password login (only when ENABLE_LOCAL_AUTH=true in .env)
if (process.env.ENABLE_LOCAL_AUTH === 'true') {
  console.log('[AUTH] Local email/password login enabled (ENABLE_LOCAL_AUTH=true)');
  router.post('/login', login);
}

// Microsoft SSO authentication
router.get('/microsoft', microsoftLogin);
router.get('/callback', microsoftCallback);

// Auth management
router.post('/logout', authenticateToken, logout);
router.post('/refresh-token', refreshToken);

// Get current authenticated user
router.get('/me', authenticateToken, getCurrentUser);

// Profile management
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/profile/stats', authenticateToken, getUserStats);
router.post('/profile/refresh-photo', authenticateToken, refreshUserPhoto);

// MS Teams integration
router.get('/link-teams', authenticateToken, linkTeamsAccount);

// Settings management
router.get('/settings', authenticateToken, getSettings);
router.put('/settings', authenticateToken, updateSettings);
router.patch('/settings', authenticateToken, updateSetting);
router.patch('/locale', authenticateToken, updateLocale);

export default router;
