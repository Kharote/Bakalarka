// Users controller for role-based user management
// Handle user listing and management based on roles

import { User, Project, ProjectMember } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

// Get all users (PM and Admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, subRole, department } = req.query;
    const userRole = req.user.role;
    
    // Only PMs and Admins can see all users
    if (userRole === 'user') {
      throw new AppError('Insufficient permissions to view all users', 403);
    }

    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { department: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role && userRole === 'admin') {
      // Only admins can filter by role
      whereClause.role = role;
    }
    
    if (subRole) {
      // Filter users who have this subRole in their subRoles array
      whereClause.subRoles = {
        [Op.contains]: [subRole]
      };
    }
    
    if (department) {
      whereClause.department = department;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'email', 'role', 'subRoles', 'department', 
        'position', 'profilePicture', 'phone', 'location', 'bio',
        'createdAt', 'lastLogin'
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    
    // Users can only view their own profile unless they're PM/Admin
    if (userRole === 'user' && id !== req.user.id) {
      throw new AppError('Insufficient permissions to view this user', 403);
    }

    const user = await User.findByPk(id, {
      attributes: [
        'id', 'name', 'email', 'role', 'subRoles', 'department', 
        'position', 'profilePicture', 'phone', 'location', 
        'bio', 'createdAt', 'lastLogin'
      ]
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user statistics
    const stats = await getUserStats(id);

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, subRoles } = req.body;
    
    // Only admins can update roles
    if (req.user.role !== 'admin') {
      throw new AppError('Only administrators can update user roles', 403);
    }

    // Validate role
    const validRoles = ['user', 'pm', 'admin'];
    if (role && !validRoles.includes(role)) {
      throw new AppError('Invalid role specified', 400);
    }

    // Validate subRoles
    const validSubRoles = ['frontend_developer', 'backend_developer', 'fullstack_developer', 'devops'];
    if (subRoles && Array.isArray(subRoles)) {
      for (const subRole of subRoles) {
        if (!validSubRoles.includes(subRole)) {
          throw new AppError(`Invalid sub-role specified: ${subRole}`, 400);
        }
      }
    }

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent self-demotion from admin
    if (id === req.user.id && req.user.role === 'admin' && role && role !== 'admin') {
      throw new AppError('Cannot demote yourself from admin role', 400);
    }

    // Update role and/or subRoles
    if (role) user.role = role;
    if (subRoles !== undefined) user.subRoles = subRoles || [];
    
    await user.save();

    res.json({
      success: true,
      message: 'User roles updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRoles: user.subRoles
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile (Admin only)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department, position, phone, location, bio } = req.body;

    if (req.user.role !== 'admin') {
      throw new AppError('Only administrators can update other users', 403);
    }

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name !== undefined) user.name = name;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        position: user.position,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
        subRoles: user.subRoles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get users by project (for assignment)
export const getUsersForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userRole = req.user.role;
    
    // Check if user can access this project
    if (userRole !== 'admin') {
      const project = await Project.findOne({
        where: {
          id: projectId,
          [Op.or]: [
            { ownerId: req.user.id },
            { '$members.userId$': req.user.id }
          ]
        },
        include: [{ model: ProjectMember, as: 'members', attributes: ['userId'] }]
      });

      if (!project) {
        throw new AppError('Access denied to this project', 403);
      }
    }

    // Get all users that can be assigned to tasks
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'profilePicture', 'department', 'position'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get user statistics
async function getUserStats(userId) {
  try {
    const [ownedProjects, memberProjects, assignedTasks, createdTasks] = await Promise.all([
      Project.count({ where: { ownerId: userId } }),
      ProjectMember.count({ where: { userId } }),
      import('../models/index.js').then(({ Task }) => Task.count({ where: { assignedToId: userId } })),
      import('../models/index.js').then(({ Task }) => Task.count({ where: { createdById: userId } }))
    ]);

    return {
      ownedProjects,
      memberProjects,
      assignedTasks,
      createdTasks,
      totalProjects: ownedProjects + memberProjects
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      ownedProjects: 0,
      memberProjects: 0,
      assignedTasks: 0,
      createdTasks: 0,
      totalProjects: 0
    };
  }
}