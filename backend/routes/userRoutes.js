// User management routes
// Handle user listing and role management

import express from 'express';
import { 
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  getUsersForProject
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole, hasAnyRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (PM and Admin only)
router.get('/', hasAnyRole(['pm', 'admin']), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user profile (Admin only)
router.put('/:id', requireRole('admin'), updateUser);

// Update user role (Admin only)
router.patch('/:id/role', requireRole('admin'), updateUserRole);

// Get users for project assignment
router.get('/project/:projectId', getUsersForProject);

export default router;