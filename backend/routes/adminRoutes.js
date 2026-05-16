// Admin Routes
// System administration routes - ALL routes require admin role

import express from 'express';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  updateMultipleSettings,
  getPrompts,
  updatePrompt,
  createPrompt,
  deletePrompt,
  getModelRestriction
} from '../controllers/systemSettingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route (auth only, no admin role required) - must be before admin middleware
router.get('/model-restriction', authenticateToken, getModelRestriction);

// All admin routes below require authentication + admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// System settings CRUD
router.get('/settings', getAllSettings);
router.get('/settings/:key(*)', getSetting);
router.put('/settings/batch', updateMultipleSettings);
router.put('/settings/:key(*)', updateSetting);

// AI Prompt templates management
router.get('/prompts', getPrompts);
router.post('/prompts/:locale/:promptName', createPrompt);
router.put('/prompts/:locale/:promptName', updatePrompt);
router.delete('/prompts/:locale/:promptName', deletePrompt);

export default router;
