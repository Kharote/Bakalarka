// Work Team controller
// Handle team management operations (separate from MS Teams integration)

import { Team, TeamMember, User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

// Create a new team (PM or Admin only)
export const createTeam = async (req, res, next) => {
  try {
    const { name, description, teamLeaderId } = req.body;

    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can create teams', 403);
    }

    if (!name || !teamLeaderId) {
      throw new AppError('Team name and team leader are required', 400);
    }

    // Verify team leader exists
    const leader = await User.findByPk(teamLeaderId);
    if (!leader) {
      throw new AppError('Team leader user not found', 404);
    }

    const team = await Team.create({
      name,
      description: description || '',
      teamLeaderId
    });

    // Add the team leader as a member with 'leader' role
    await TeamMember.create({
      teamId: team.id,
      userId: teamLeaderId,
      role: 'leader'
    });

    const teamWithDetails = await Team.findByPk(team.id, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: teamWithDetails
    });
  } catch (error) {
    next(error);
  }
};

// Get all teams (filtered by role)
export const getAllTeams = async (req, res, next) => {
  try {
    const { search } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = { isActive: true };

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    let teams;

    if (userRole === 'admin') {
      // Admin sees all teams
      teams = await Team.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
          {
            model: TeamMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
          }
        ],
        order: [['name', 'ASC']]
      });
    } else if (userRole === 'pm') {
      // PM sees all teams (for project creation)
      teams = await Team.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
          {
            model: TeamMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
          }
        ],
        order: [['name', 'ASC']]
      });
    } else {
      // Regular user sees only teams they belong to or lead
      teams = await Team.findAll({
        where: {
          ...whereClause,
          [Op.or]: [
            { teamLeaderId: userId },
            { '$members.userId$': userId }
          ]
        },
        include: [
          { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
          {
            model: TeamMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
          }
        ],
        order: [['name', 'ASC']]
      });
    }

    res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    next(error);
  }
};

// Get team by ID
export const getTeamById = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findByPk(teamId, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Check access: admin, pm, team leader, or team member
    const userRole = req.user.role;
    const userId = req.user.id;
    if (userRole === 'user') {
      const isMember = team.members.some(m => m.userId === userId);
      const isLeader = team.teamLeaderId === userId;
      if (!isMember && !isLeader) {
        throw new AppError('Access denied to this team', 403);
      }
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    next(error);
  }
};

// Update team (team leader, PM, or admin)
export const updateTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;

    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Only team leader, PM, or admin can update
    if (req.user.role === 'user' && team.teamLeaderId !== req.user.id) {
      throw new AppError('Only the team leader, PM, or admin can update the team', 403);
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    await team.save();

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

// Delete team (PM or admin only)
export const deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can delete teams', 403);
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Delete all team members first
    await TeamMember.destroy({ where: { teamId } });
    await team.destroy();

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add member to team (team leader, PM, or admin)
export const addTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Check permissions: team leader, PM, or admin
    if (req.user.role === 'user' && team.teamLeaderId !== req.user.id) {
      throw new AppError('Only the team leader, PM, or admin can add members', 403);
    }

    // Check user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    const existingMember = await TeamMember.findOne({
      where: { teamId, userId }
    });
    if (existingMember) {
      throw new AppError('User is already a member of this team', 400);
    }

    await TeamMember.create({
      teamId,
      userId,
      role: 'member'
    });

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Member added to team successfully',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from team (team leader, PM, or admin)
export const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Check permissions: team leader, PM, or admin
    if (req.user.role === 'user' && team.teamLeaderId !== req.user.id) {
      throw new AppError('Only the team leader, PM, or admin can remove members', 403);
    }

    // Cannot remove the team leader
    if (userId === team.teamLeaderId) {
      throw new AppError('Cannot remove the team leader from the team. Transfer leadership first.', 400);
    }

    const member = await TeamMember.findOne({
      where: { teamId, userId }
    });
    if (!member) {
      throw new AppError('User is not a member of this team', 404);
    }

    await member.destroy();

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Member removed from team successfully',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

// Transfer team leadership (current TL, PM, or admin)
export const transferLeadership = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { newLeaderId } = req.body;

    if (!newLeaderId) {
      throw new AppError('New leader ID is required', 400);
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Only current TL, PM, or admin can transfer
    if (req.user.role === 'user' && team.teamLeaderId !== req.user.id) {
      throw new AppError('Only the team leader, PM, or admin can transfer leadership', 403);
    }

    // Check new leader exists
    const newLeader = await User.findByPk(newLeaderId);
    if (!newLeader) {
      throw new AppError('New leader user not found', 404);
    }

    // Make sure new leader is a team member
    const newLeaderMember = await TeamMember.findOne({
      where: { teamId, userId: newLeaderId }
    });
    if (!newLeaderMember) {
      // Add them to the team first
      await TeamMember.create({
        teamId,
        userId: newLeaderId,
        role: 'leader'
      });
    } else {
      newLeaderMember.role = 'leader';
      await newLeaderMember.save();
    }

    // Demote old leader to member
    const oldLeaderMember = await TeamMember.findOne({
      where: { teamId, userId: team.teamLeaderId }
    });
    if (oldLeaderMember) {
      oldLeaderMember.role = 'member';
      await oldLeaderMember.save();
    }

    // Update team leader
    team.teamLeaderId = newLeaderId;
    await team.save();

    const updatedTeam = await Team.findByPk(teamId, {
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Team leadership transferred successfully',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

// Get teams where current user is team leader
export const getMyTeams = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const teams = await Team.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { teamLeaderId: userId },
          { '$members.userId$': userId }
        ]
      },
      include: [
        { model: User, as: 'teamLeader', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department'] }]
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    next(error);
  }
};

// Get members of a specific team (for project selection)
export const getTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findByPk(teamId, {
      include: [
        {
          model: TeamMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles', 'bio', 'position', 'department']
          }]
        }
      ]
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const members = team.members.map(m => m.user);

    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    next(error);
  }
};
