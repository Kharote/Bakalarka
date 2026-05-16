// Work Team routes (separate from MS Teams integration)
import express from 'express';
import {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  transferLeadership,
  getMyTeams,
  getTeamMembers
} from '../controllers/workTeamController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Team CRUD
router.post('/', createTeam);
router.get('/', getAllTeams);
router.get('/my-teams', getMyTeams);
router.get('/:teamId', getTeamById);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

// Team member management
router.get('/:teamId/members', getTeamMembers);
router.post('/:teamId/members', addTeamMember);
router.delete('/:teamId/members/:userId', removeTeamMember);

// Leadership transfer
router.post('/:teamId/transfer-leadership', transferLeadership);

export default router;
