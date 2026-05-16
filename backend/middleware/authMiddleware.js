// Authentication middleware
// Verify JWT tokens and MS SSO authentication

import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { User } from '../models/index.js';

// Verify JWT token from request headers
export const authenticateToken = async (req, res, next) => {
  try {
    console.log('Authenticating request...');
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.error('[ERROR] No token found in Authorization header');
      throw new AppError('Access token is required', 401);
    }

    console.log('Verifying Bearer token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified for user:', decoded.id);
    
    // Find user and attach to request
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'azureAdToken', 'refreshToken'] }
    });
    
    if (!user) {
      console.error('[ERROR] User not found for ID:', decoded.id);
      throw new AppError('User not found', 404);
    }

    console.log('User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

// Check if user has specific role
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Role ${req.user.role} is not authorized to access this resource`,
        403
      );
    }
    next();
  };
};

// Check if user is project member or admin
export const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    
    // Import models here to avoid circular dependencies
    const { Project, ProjectMember } = await import('../models/index.js');
    const project = await Project.findByPk(projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check if user is owner
    if (project.ownerId === req.user.id) {
      req.project = project;
      return next();
    }

    // Check if user is a member
    const membership = await ProjectMember.findOne({
      where: {
        projectId: projectId,
        userId: req.user.id
      }
    });

    const isAdmin = req.user.role === 'admin';

    if (!membership && !isAdmin) {
      throw new AppError('You do not have access to this project', 403);
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};
