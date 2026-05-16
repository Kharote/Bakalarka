// Role-based access control middleware
// Check user permissions based on roles

import { AppError } from './errorHandler.js';
import { Op } from 'sequelize';

// Role hierarchy for permission checking
const roleHierarchy = {
  'user': 1,
  'pm': 2,
  'admin': 3
};

// Check if user has required role
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        throw new AppError('User role not found', 403);
      }

      const userLevel = roleHierarchy[userRole];
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole || !roles.includes(userRole)) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user can access specific resource
export const canAccessResource = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const resourceId = req.params.id || req.params.projectId || req.params.taskId;

      switch (userRole) {
        case 'admin':
          // Admins can access everything
          break;
          
        case 'pm':
          // PMs can access projects they own or are members of
          if (resourceType === 'project') {
            const { Project, ProjectMember } = await import('../models/index.js');
            const hasAccess = await Project.findOne({
              where: {
                id: resourceId,
                [Op.or]: [
                  { ownerId: userId },
                  { '$members.userId$': userId }
                ]
              },
              include: [{ model: ProjectMember, as: 'members', attributes: ['userId'] }]
            });
            
            if (!hasAccess) {
              throw new AppError('Access denied to this resource', 403);
            }
          }
          break;
          
        case 'user':
          // Users can only access resources they own or are assigned to
          if (resourceType === 'project') {
            const { Project, ProjectMember } = await import('../models/index.js');
            const hasAccess = await Project.findOne({
              where: {
                id: resourceId,
                [Op.or]: [
                  { ownerId: userId },
                  { '$members.userId$': userId }
                ]
              },
              include: [{ model: ProjectMember, as: 'members', attributes: ['userId'] }]
            });
            
            if (!hasAccess) {
              throw new AppError('Access denied to this resource', 403);
            }
          } else if (resourceType === 'task') {
            const { Task } = await import('../models/index.js');
            const hasAccess = await Task.findOne({
              where: {
                id: resourceId,
                [Op.or]: [
                  { assignedToId: userId },
                  { createdById: userId }
                ]
              }
            });
            
            if (!hasAccess) {
              throw new AppError('Access denied to this resource', 403);
            }
          }
          break;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role-based data filtering
export const filterDataByRole = (req, res, next) => {
  // Add role-based filtering to the request
  req.roleFilter = {
    canSeeAllUsers: req.user?.role === 'admin' || req.user?.role === 'pm',
    canSeeAllProjects: req.user?.role === 'admin',
    canManageUsers: req.user?.role === 'admin',
    canCreateProjects: req.user?.role !== 'user',
    userId: req.user?.id,
    userRole: req.user?.role
  };
  
  next();
};