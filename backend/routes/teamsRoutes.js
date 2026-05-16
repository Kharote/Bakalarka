// Microsoft Teams routes
// Handle MS Teams API integration for task management

import express from 'express';
import {
  createTeamsChannel,
  sendTeamsMessage,
  createTeamsTask,
  updateTeamsTask,
  syncTaskWithTeams,
  getTeamsChannels,
  getTeamsTasks
} from '../controllers/teamsController.js';
import { authenticateToken, checkProjectAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Teams channel operations
router.post('/channel/:projectId', checkProjectAccess, createTeamsChannel);
router.get('/channels', getTeamsChannels);

// Teams messaging
router.post('/message/:projectId', checkProjectAccess, sendTeamsMessage);

// Teams task operations
router.post('/task', authenticateToken, createTeamsTask);
router.put('/task/:taskId', updateTeamsTask);
router.post('/sync-task/:taskId', syncTaskWithTeams);
router.get('/tasks/:projectId', getTeamsTasks);

export default router;
