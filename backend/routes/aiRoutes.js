// AI routes
// Handle AI-powered project management suggestions

import express from 'express';
import {
  generateProjectPlan,
  suggestTasks,
  analyzeProjectRisks,
  optimizeResourceAllocation,
  predictProjectTimeline,
  generateTaskDescription,
  analyzeSentiment
} from '../controllers/aiController.js';
import { chatWithProject, getProjectsForChat, getChatHistory, clearChatHistory } from '../controllers/aiChatController.js';
import { authenticateToken, checkProjectAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// AI Chat
router.post('/chat', chatWithProject);
router.get('/chat/projects', getProjectsForChat);
router.get('/chat/history/:projectId', getChatHistory);
router.delete('/chat/history/:projectId', clearChatHistory);

// AI-powered suggestions
router.post('/project-plan', generateProjectPlan);
router.post('/suggest-tasks/:projectId', checkProjectAccess, suggestTasks);
router.post('/analyze-risks/:projectId', checkProjectAccess, analyzeProjectRisks);
router.post('/optimize-resources/:projectId', checkProjectAccess, optimizeResourceAllocation);
router.post('/predict-timeline/:projectId', checkProjectAccess, predictProjectTimeline);
router.post('/generate-task-description', generateTaskDescription);
router.post('/analyze-sentiment', analyzeSentiment);

export default router;
