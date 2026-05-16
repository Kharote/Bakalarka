// Project routes
// Handle project CRUD operations and team collaboration

import express from 'express';
import {
  createProject,
  createProjectWithWorkflow,
  generateAISuggestions,
  getAISuggestions,
  updateAISuggestions,
  getAvailableAIModels,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectAIStatus,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectProgress,
  getProjectStatistics,
  updateProjectStatus
} from '../controllers/projectController.js';
import { applyAISuggestions } from '../controllers/applyAISuggestions.js';
import { authenticateToken, checkProjectAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Project CRUD
router.post('/', createProject);
router.post('/create-with-workflow', createProjectWithWorkflow);
router.post('/generate-ai-suggestions', generateAISuggestions);
router.get('/ai-suggestions/:suggestionId', getAISuggestions);
router.put('/ai-suggestions/:suggestionId', updateAISuggestions);
router.post('/:projectId/apply-ai-suggestions', checkProjectAccess, applyAISuggestions);
router.get('/ai-models', getAvailableAIModels);
router.get('/', getAllProjects);
router.get('/:projectId', checkProjectAccess, getProjectById);
router.put('/:projectId', checkProjectAccess, updateProject);
router.patch('/:projectId/ai-status', updateProjectAIStatus);
router.delete('/:projectId', checkProjectAccess, deleteProject);

// Project members management
router.post('/:projectId/members', checkProjectAccess, addProjectMember);
router.delete('/:projectId/members/:userId', checkProjectAccess, removeProjectMember);

// Project statistics and progress
router.put('/:projectId/progress', checkProjectAccess, updateProjectProgress);
router.patch('/:projectId/status', checkProjectAccess, updateProjectStatus);
router.get('/:projectId/statistics', checkProjectAccess, getProjectStatistics);

export default router;
