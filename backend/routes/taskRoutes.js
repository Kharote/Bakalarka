// Task routes
// Handle task operations and MS Teams integration

import express from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  addComment,
  updateTaskStatus,
  getTasksByProject,
  getMyTasks,
  syncPlannerTasks,
  syncAllMyPlannerTasks
} from '../controllers/taskController.js';
import { authenticateToken, checkProjectAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Task CRUD
router.post('/', authenticateToken, createTask);
router.get('/', getAllTasks);
router.get('/my-tasks', getMyTasks);
router.get('/project/:projectId', getTasksByProject);
router.get('/:taskId', getTaskById);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

// Task operations
router.put('/:taskId/assign', assignTask);
router.put('/:taskId/status', updateTaskStatus);
router.post('/:taskId/comments', addComment);

// Planner sync
router.post('/sync-planner', syncAllMyPlannerTasks);
router.post('/project/:projectId/sync-planner', syncPlannerTasks);

export default router;
