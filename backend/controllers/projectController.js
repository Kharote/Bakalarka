// Project controller for PostgreSQL
// Handle project management operations

import { Project, ProjectMember, Task, User, Team, TeamMember } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs-extra';
import { createNotification } from './notificationController.js';
import { sendNotificationToUser } from '../services/websocketService.js';
import { getSetting } from '../services/systemSettingsService.js';

// Create new project
export const createProject = async (req, res, next) => {
  try {
    const { 
      name, description, startDate, endDate, priority, budget, tags, 
      projectManagerId, teamMembers, selectedTeamIds, aiStatus, aiOptions, locale
    } = req.body;

    // ==================== FULL DEBUG LOG ====================
    console.log('\n==================== PROJECT CREATION REQUEST ====================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Created by:', req.user.email, `(${req.user.role})`);
    console.log('\nREQUEST BODY FROM FRONTEND:');
    console.log(JSON.stringify({
      name,
      description,
      startDate,
      endDate,
      priority,
      budget,
      tags,
      projectManagerId,
      teamMembers,
      aiStatus,
      aiOptions,
      locale
    }, null, 2));
    console.log('============================================================================\n');
    // ==================== END DEBUG LOG ====================

    // Check if user can create projects (PM or Admin only)
    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can create projects', 403);
    }

    // Check max projects per user limit from system settings (0 = unlimited)
    try {
      const maxProjectsSetting = await getSetting('system.maxProjectsPerUser');
      if (maxProjectsSetting?.limit && maxProjectsSetting.limit > 0) {
        const userProjectCount = await Project.count({ where: { ownerId: req.user.id } });
        if (userProjectCount >= maxProjectsSetting.limit) {
          throw new AppError(`You have reached the maximum number of projects (${maxProjectsSetting.limit}). Contact an administrator to increase the limit.`, 403);
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('Could not check project limit:', err.message);
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      throw new AppError('Start date must be before end date', 400);
    }

    // Create project with AI status if provided
    const projectData = {
      name,
      description,
      startDate,
      endDate,
      priority,
      budget: budget || 0,
      tags: tags || [],
      status: 'planning',
      progress: 0,
      ownerId: req.user.id,
      createdBy: req.user.id,
      locale: locale || 'en'
    }

    // Add AI-specific fields if AI is being used
    if (aiStatus) {
      projectData.aiStatus = aiStatus // 'generating', 'completed', 'failed', null
      projectData.aiOptions = aiOptions // Store AI options for reference
    }

    console.log('Creating project with data:', projectData);
    const project = await Project.create(projectData);
    console.log('Project created with ID:', project.id);

    // Add project manager as owner if specified and different from creator
    if (projectManagerId && projectManagerId !== req.user.id) {
      console.log('Adding project manager as owner:', projectManagerId);
      await ProjectMember.create({
        projectId: project.id,
        userId: projectManagerId,
        role: 'owner'
      });
      console.log('Project manager added');
    }
    
    // Add creator as owner
    console.log('Adding creator as owner:', req.user.id);
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: 'owner'
    });
    console.log('Creator added as owner');
    
    // Add team members to project
    const addedMemberIds = new Set();
    if (projectManagerId) addedMemberIds.add(projectManagerId);
    addedMemberIds.add(req.user.id);

    // Expand members from selected work teams
    if (selectedTeamIds && selectedTeamIds.length > 0) {
      console.log('Expanding members from selected teams:', selectedTeamIds);
      const teamMembersFromTeams = await TeamMember.findAll({
        where: { teamId: { [Op.in]: selectedTeamIds } },
        attributes: ['userId']
      });
      for (const tm of teamMembersFromTeams) {
        if (!addedMemberIds.has(tm.userId)) {
          await ProjectMember.create({
            projectId: project.id,
            userId: tm.userId,
            role: 'member'
          });
          addedMemberIds.add(tm.userId);
          console.log('   Added team member from work team:', tm.userId);
        }
      }
    }

    if (teamMembers && teamMembers.length > 0) {
      console.log('Adding individual team members to project. Count:', teamMembers.length);
      for (const member of teamMembers) {
        // Extract ID from member object or use as-is if it's a string
        const memberId = typeof member === 'object' ? (member.id || member.userId) : member;
        
        console.log('   Processing member:', { input: member, extractedId: memberId });
        
        // Skip if member already added (owner/PM/team)
        if (addedMemberIds.has(memberId)) {
          console.log('   [SKIP] Skipping (already added)');
          continue;
        }
        
        await ProjectMember.create({
          projectId: project.id,
          userId: memberId,
          role: 'member'
        });
        addedMemberIds.add(memberId);
        console.log('   Added team member:', memberId);
      }
    }

    // Fetch project with associations
    const projectWithDetails = await Project.findByPk(project.id, {
      attributes: [
        'id', 'name', 'description', 'status', 'priority', 'startDate', 'endDate', 
        'budget', 'ownerId', 'teamsChannelId', 'teamsWebUrl', 'tags', 'progress',
        'aiStatus', 'aiOptions', 'aiSuggestionId', 'createdAt', 'updatedAt'
      ],
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: projectWithDetails
    });
  } catch (error) {
    next(error);
  }
};

// Get all projects for current user
export const getAllProjects = async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let whereClause = {};
    
    // Role-based filtering
    if (userRole === 'admin') {
      // Admins see all projects
      whereClause = {};
    } else if (userRole === 'pm') {
      // PMs see projects they own or are members of
      whereClause = {
        [Op.or]: [
          { ownerId: userId },
          { '$members.userId$': userId }
        ]
      };
    } else {
      // Users only see projects they are members of
      whereClause = {
        [Op.or]: [
          { ownerId: userId },
          { '$members.userId$': userId }
        ]
      };
    }

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      };
      whereClause = { [Op.and]: [whereClause, searchCondition] };
    }

    const projects = await Project.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'description', 'status', 'priority', 'startDate', 'endDate', 
        'budget', 'ownerId', 'teamsChannelId', 'teamsWebUrl', 'tags', 'progress',
        'aiStatus', 'aiOptions', 'aiSuggestionId', 'createdAt', 'updatedAt'
      ],
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    next(error);
  }
};

// Get project by ID
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ]
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    next(error);
  }
};

// Update project
export const updateProject = async (req, res, next) => {
  try {
    const { name, description, status, priority, startDate, endDate, budget, tags } = req.body;

    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Update fields
    await project.update({
      ...(name && { name }),
      ...(description && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(budget !== undefined && { budget }),
      ...(tags && { tags })
    });

    const updatedProject = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// Delete project
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check if user is owner
    if (project.ownerId !== req.user.id) {
      throw new AppError('Only project owner can delete the project', 403);
    }

    // Delete all associated tasks and members
    await Task.destroy({ where: { projectId: project.id } });
    await ProjectMember.destroy({ where: { projectId: project.id } });
    await project.destroy();

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add member to project
export const addProjectMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check if user is already a member
    const existingMember = await ProjectMember.findOne({
      where: {
        projectId: project.id,
        userId: userId
      }
    });

    if (existingMember) {
      throw new AppError('User is already a project member', 400);
    }

    await ProjectMember.create({
      projectId: project.id,
      userId: userId,
      role: role || 'member'
    });

    const updatedProject = await Project.findByPk(project.id, {
      include: [
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      project: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from project
export const removeProjectMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Cannot remove owner
    if (project.ownerId === userId) {
      throw new AppError('Cannot remove project owner', 400);
    }

    await ProjectMember.destroy({
      where: {
        projectId: project.id,
        userId: userId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update project progress
export const updateProjectProgress = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const tasks = await Task.findAll({ where: { projectId: project.id } });
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    await project.update({ progress });

    res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    next(error);
  }
};

// Update project status (PM/Admin/Owner only)
// Completed status requires explicit approval - not auto-set
export const updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const project = await Project.findByPk(req.params.projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Only owner, PM, or admin can change status
    const userRole = req.user.role;
    const isOwner = project.ownerId === req.user.id;
    if (!isOwner && userRole !== 'pm' && userRole !== 'admin') {
      throw new AppError('Only project owner, PM, or admin can change project status', 403);
    }

    const oldStatus = project.status;
    await project.update({ status });

    // If marking as completed, set progress to 100 and complete all tasks
    if (status === 'completed') {
      if (project.progress < 100) {
        await project.update({ progress: 100 });
      }

      // Mark all incomplete tasks as completed
      const incompleteTasks = await Task.findAll({
        where: {
          projectId: project.id,
          status: { [Op.ne]: 'completed' }
        }
      });

      if (incompleteTasks.length > 0) {
        await Task.update(
          { status: 'completed' },
          { where: { projectId: project.id, status: { [Op.ne]: 'completed' } } }
        );
        console.log(`[Project Complete] Marked ${incompleteTasks.length} tasks as completed for project "${project.name}"`);

        // Sync completed tasks to Microsoft Planner (set percentComplete = 100)
        if (project.plannerPlanId) {
          try {
            const teamsIntegration = await import('../services/teamsIntegrationService.js');
            const teamsService = teamsIntegration.default;
            const tasksWithPlanner = incompleteTasks.filter(t => t.teamsTaskId);
            for (const task of tasksWithPlanner) {
              await teamsService.updatePlannerTaskPercent(task.teamsTaskId, 100);
            }
            console.log(`[Project Complete] Synced ${tasksWithPlanner.length} tasks to Planner as 100% complete`);
          } catch (teamsErr) {
            console.error('[Project Complete] Failed to sync tasks to Planner:', teamsErr.message);
          }
        }
      }
    }

    // Notify all project members about status change
    if (oldStatus !== status) {
      const members = await ProjectMember.findAll({
        where: { projectId: project.id },
        attributes: ['userId']
      });

      for (const member of members) {
        if (member.userId !== req.user.id) {
          try {
            await createNotification({
              userId: member.userId,
              type: 'project_updated',
              title: status === 'completed' ? 'Project Completed' : 'Project Status Changed',
              message: status === 'completed'
                ? `Project "${project.name}" has been marked as completed by ${req.user.name || req.user.email}`
                : `Project "${project.name}" status changed from ${oldStatus} to ${status}`,
              relatedId: project.id,
              relatedType: 'project',
              priority: status === 'completed' ? 'high' : 'normal'
            });
          } catch (notifErr) {
            console.error('Failed to send status change notification:', notifErr.message);
          }
        }
      }
    }

    const updatedProject = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        {
          model: ProjectMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture'] }]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Project status updated to ${status}`,
      project: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// Get project statistics
export const getProjectStatistics = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const tasks = await Task.findAll({ where: { projectId: project.id } });

    const statistics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length,
      overdueTasks: tasks.filter(t => t.dueDate && new Date() > new Date(t.dueDate) && t.status !== 'completed').length,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + parseFloat(t.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, t) => sum + parseFloat(t.actualHours || 0), 0),
      progress: project.progress
    };

    res.status(200).json({
      success: true,
      statistics
    });
  } catch (error) {
    next(error);
  }
};

// Generate AI suggestions for project planning (for existing projects)
export const generateAISuggestions = async (req, res, next) => {
  try {
    const { 
      name, description, startDate, endDate, priority, tags, budget, teamMembers,
      generateTasks, generateRisks, generateGantt, selectedModel, projectId, locale,
      projectManagerId, selectedTeamIds
    } = req.body;

    // ==================== FULL DEBUG LOG ====================
    console.log('\n==================== AI SUGGESTION GENERATION REQUEST ====================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Requested by:', req.user.email, `(${req.user.role})`);
    console.log('\nREQUEST BODY FROM FRONTEND:');
    console.log(JSON.stringify({
      name,
      description,
      startDate,
      endDate,
      priority,
      tags,
      budget,
      projectManagerId,
      teamMembers,
      generateTasks,
      generateRisks,
      generateGantt,
      selectedModel,
      projectId,
      locale
    }, null, 2));
    
    console.log('\nPROJECT MANAGER:');
    if (projectManagerId) {
      console.log('   ID:', projectManagerId);
    } else {
      console.log('   [WARN] NO PROJECT MANAGER PROVIDED - will use creator');
    }
    
    console.log('\nTEAM MEMBERS (raw from FE):');
    if (teamMembers && teamMembers.length > 0) {
      console.log('   Total count:', teamMembers.length);
      teamMembers.forEach((member, index) => {
        console.log(`   [${index}]:`, JSON.stringify(member, null, 2));
      });
    } else {
      console.log('   [WARN] No team members provided');
    }
    
    console.log('\nAI OPTIONS:');
    console.log('   Generate Tasks:', generateTasks);
    console.log('   Generate Risks:', generateRisks);
    console.log('   Generate Gantt:', generateGantt);
    console.log('   Model:', selectedModel);
    console.log('   Locale:', locale);
    console.log('============================================================================\n');
    // ==================== END DEBUG LOG ====================

    // Check if user can create projects (PM or Admin only) 
    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can generate AI suggestions', 403);
    }

    // Validate required fields
    if (!name || !description || !startDate || !endDate) {
      throw new AppError('Project name, description, start date, and end date are required', 400);
    }

    // Import AI service (Gemini or OpenWebUI based on env config)
    const getAIService = (await import('../services/aiServiceFactory.js')).default;
    const aiService = await getAIService();

    // Get detailed team member data for AI analysis
    let detailedTeamMembers = [];
    
    // Build list of ALL user IDs to fetch (PM + team members + work team members)
    const allUserIds = new Set();
    
    // Add Project Manager ID first if provided
    if (projectManagerId) {
      allUserIds.add(projectManagerId);
      console.log('Including Project Manager in AI team analysis:', projectManagerId);
    }
    
    // Add team member IDs from individually selected members
    if (teamMembers && teamMembers.length > 0) {
      const memberIds = teamMembers
        .map(m => m.id || m.userId || m.user?.id)
        .filter(id => id);
      
      memberIds.forEach(id => allUserIds.add(id));
      console.log('Including individual team members in AI analysis:', memberIds);
    }

    // Expand members from selected work teams
    if (selectedTeamIds && selectedTeamIds.length > 0) {
      console.log('Expanding members from work teams for AI analysis:', selectedTeamIds);
      const teamMembersFromTeams = await TeamMember.findAll({
        where: { teamId: { [Op.in]: selectedTeamIds } },
        attributes: ['userId']
      });
      teamMembersFromTeams.forEach(tm => allUserIds.add(tm.userId));
      console.log('Total unique IDs after team expansion:', allUserIds.size);
    }
    
    // Fetch all users (PM + team members + work team members) for AI task generation
    if (allUserIds.size > 0) {
      detailedTeamMembers = await User.findAll({
        where: { id: { [Op.in]: Array.from(allUserIds) } },
        attributes: ['id', 'name', 'email', 'subRoles', 'bio']
      });
      console.log('Total team for AI analysis:', detailedTeamMembers.length, 'members');
      console.log('   Names:', detailedTeamMembers.map(m => `${m.name} (${m.subRoles?.join(', ') || 'no sub-roles'})`));
    }
    
    // If no team members provided at all, include the project creator
    if (detailedTeamMembers.length === 0) {
      console.log('[WARN] No team members or PM provided, adding project creator as fallback');
      const creator = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'subRoles', 'bio']
      });
      if (creator) {
        detailedTeamMembers = [creator];
      }
    }

    // Build complete project data for AI analysis
    const projectData = {
      id: projectId,
      name,
      description,
      startDate,
      endDate,
      priority: priority || 'Medium',
      tags: tags || [],
      budget: budget || 0,
      locale: locale || 'en'
    };

    const analysis = {};

    // Generate AI suggestions based on requested options
    if (generateTasks) {
      console.log('Generating AI tasks...');
      const taskResult = await aiService.generateProjectTasks(
        projectData,
        detailedTeamMembers,
        selectedModel
      );
      analysis.tasks = taskResult.tasks || taskResult;
      analysis.summary = taskResult.summary || {};
    }

    if (generateRisks) {
      console.log('Generating AI risks...');
      analysis.risks = await aiService.generateRiskAnalysis(
        projectData,
        selectedModel
      );
    }

    if (generateGantt) {
      console.log('Generating AI timeline and Gantt chart...');
      try {
        analysis.timeline = await aiService.generateTimeline(
          projectData,
          selectedModel
        );
        const ganttResult = await aiService.generateGanttChart(
          projectData,
          analysis.tasks,
          selectedModel
        );
        if (ganttResult) analysis.ganttChart = ganttResult;
      } catch (ganttError) {
        console.warn('[AI] Gantt step failed (non-fatal):', ganttError.message);
      }
    }

    // Generate a unique suggestion ID for storage
    const suggestionId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store analysis data
    const analysisData = {
      suggestionId,
      projectId,
      projectName: name,
      analysis,
      metadata: {
        model: selectedModel,
        generatedAt: new Date().toISOString(),
        options: { generateTasks, generateRisks, generateGantt, locale: locale || 'en' }
      }
    };

    const analysisPath = path.join(process.cwd(), 'ai-suggestions', `${suggestionId}.json`);
    await fs.ensureDir(path.dirname(analysisPath));
    await fs.writeJSON(analysisPath, analysisData, { spaces: 2 });
    
    // Update project status to 'waiting_approval' if projectId is provided
    if (projectId) {
      await Project.update(
        { 
          aiStatus: 'waiting_approval',
          aiSuggestionId: suggestionId,
          ...(locale ? { locale } : {})
        },
        { where: { id: projectId } }
      );
    }

    // Create notification in database
    await createNotification({
      userId: req.user.id,
      type: 'ai_suggestion_ready',
      title: 'AI Project Analysis Ready',
      message: `AI analysis for project "${name}" has been completed and is ready for review.`,
      priority: 'high',
      relatedId: projectId,
      relatedType: 'project'
    });

    res.json({
      success: true,
      message: 'AI suggestions generated successfully',
      data: { 
        suggestionId,
        analysis,
        projectId,
        redirectUrl: `/ai-suggestions/${suggestionId}`
      }
    });

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    
    // Update project status to failed if projectId is provided
    if (req.body.projectId) {
      try {
        await Project.update(
          { aiStatus: 'failed' },
          { where: { id: req.body.projectId } }
        );
        
        // Create failure notification
        await createNotification({
          userId: req.user.id,
          type: 'ai_suggestion_failed',
          title: 'AI Project Analysis Failed',
          message: `AI analysis for project "${req.body.name || 'Unknown'}" has failed. You can retry the analysis from the project card.`,
          priority: 'high',
          relatedId: req.body.projectId,
          relatedType: 'project'
        });
      } catch (updateError) {
        console.error('Failed to update project AI status to failed:', updateError);
      }
    }
    
    next(error);
  }
};

// Get available AI models for project generation
export const getAvailableAIModels = async (req, res, next) => {
  try {
    // Check if user can create projects (PM or Admin only) 
    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can access AI models', 403);
    }

    // Import AI service (Gemini or OpenWebUI based on env config)
    const getAIService = (await import('../services/aiServiceFactory.js')).default;
    const aiService = await getAIService();

    const models = await aiService.getAvailableModels();

    res.json({
      success: true,
      data: { models }
    });

  } catch (error) {
    console.error('Error fetching available AI models:', error);
    next(error);
  }
};

// Create project with comprehensive workflow (Teams + AI)
export const createProjectWithWorkflow = async (req, res, next) => {
  try {
    const { 
      name, description, startDate, endDate, priority, budget, tags,
      projectManagerId, teamMembers, generateTasks, generateRisks, 
      generateGantt, createTeamsSpace, aiAnalysis: providedAiAnalysis 
    } = req.body;

    // Check if user can create projects (PM or Admin only)
    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can create projects', 403);
    }

    // Check max projects per user limit from system settings (0 = unlimited)
    try {
      const maxProjectsSetting = await getSetting('system.maxProjectsPerUser');
      if (maxProjectsSetting?.limit && maxProjectsSetting.limit > 0) {
        const userProjectCount = await Project.count({ where: { ownerId: req.user.id } });
        if (userProjectCount >= maxProjectsSetting.limit) {
          throw new AppError(`You have reached the maximum number of projects (${maxProjectsSetting.limit}). Contact an administrator to increase the limit.`, 403);
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn('Could not check project limit:', err.message);
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      throw new AppError('Start date must be before end date', 400);
    }

    // Validate team members
    if (!teamMembers || teamMembers.length === 0) {
      throw new AppError('At least one team member must be assigned', 400);
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      priority,
      budget: budget || 0,
      tags: tags || [],
      ownerId: req.user.id,
      aiSuggestions: providedAiAnalysis || {}
    });

    // Add project manager as owner
    const projectManagerRole = projectManagerId === req.user.id ? 'owner' : 'manager';
    await ProjectMember.create({
      projectId: project.id,
      userId: projectManagerId,
      role: projectManagerRole
    });

    // Add team members
    for (const memberId of teamMembers) {
      if (memberId !== projectManagerId) {
        await ProjectMember.create({
          projectId: project.id,
          userId: memberId,
          role: 'member'
        });
      }
    }

    // Get team members with their skills for AI analysis
    const teamMemberDetails = await User.findAll({
      where: { id: teamMembers },
      attributes: ['id', 'name', 'email', 'subRoles', 'position']
    });

    let aiAnalysis = {};
    let teamsWorkspace = null;
    const workflowResults = [];

    try {
      // Use provided AI analysis or generate new one if requested
      if (providedAiAnalysis) {
        // Use pre-approved AI analysis from frontend
        aiAnalysis = providedAiAnalysis;
        workflowResults.push('Using approved AI analysis from review process');
        
        // Create tasks from approved AI recommendations
        if (aiAnalysis.tasks && aiAnalysis.tasks.length > 0) {
          for (const taskData of aiAnalysis.tasks) {
            // Find team member with matching role
            const assignee = teamMemberDetails.find(member => 
              member.subRoles?.includes(
                taskData.assignedRole?.toLowerCase().replace(' ', '_')
              )
            );

            await Task.create({
              projectId: project.id,
              name: taskData.name,
              description: taskData.description,
              assigneeId: assignee?.id || projectManagerId,
              priority: taskData.priority?.toLowerCase() || 'medium',
              status: 'pending',
              estimatedHours: taskData.estimatedHours || 8,
              phase: taskData.phase || 'Development'
            });
          }
          workflowResults.push(`Created ${aiAnalysis.tasks.length} tasks from approved AI recommendations`);
        }
        
      } else if (generateTasks || generateRisks || generateGantt) {
        // Generate AI analysis if requested and no pre-approved analysis provided
        workflowResults.push('Generating AI project analysis...');
        
        // Dynamically import AI service (Gemini or OpenWebUI based on env config)
        const getAIService = (await import('../services/aiServiceFactory.js')).default;
        const aiService = await getAIService();
        aiAnalysis = await aiService.generateProjectAnalysis(
          { ...req.body, name, description, startDate, endDate, priority, tags },
          teamMemberDetails
        );

        // Create tasks from AI recommendations
        if (aiAnalysis.tasks && aiAnalysis.tasks.length > 0) {
          for (const taskData of aiAnalysis.tasks) {
            // Find team member with matching role
            const assignee = teamMemberDetails.find(member => 
              member.subRoles?.includes(
                taskData.assignedRole?.toLowerCase().replace(' ', '_')
              )
            );

            await Task.create({
              projectId: project.id,
              name: taskData.name,
              description: taskData.description,
              assigneeId: assignee?.id || projectManagerId,
              priority: taskData.priority?.toLowerCase() || 'medium',
              status: 'pending',
              estimatedHours: taskData.estimatedHours || 8,
              phase: taskData.phase || 'Development'
            });
          }
          workflowResults.push(`Generated ${aiAnalysis.tasks.length} AI-recommended tasks`);
        }
      }

      // Create Microsoft Teams workspace if requested
      if (createTeamsSpace) {
        try {
          workflowResults.push('Creating Microsoft Teams workspace...');
          
          // Dynamically import Teams integration service
          const teamsIntegration = await import('../services/teamsIntegrationService.js');
          
          // Create Teams workspace
          teamsWorkspace = await teamsIntegration.default.createProjectTeam(
            { name, description, projectManagerId },
            teamMembers
          );

          // Create project channels
          if (teamsWorkspace?.teamId) {
            const channels = await teamsIntegration.default.createProjectChannels(teamsWorkspace.teamId);
            workflowResults.push(`Created Teams workspace with ${channels.length} channels`);

            // Send AI analysis to Teams if available
            if (Object.keys(aiAnalysis).length > 0) {
              const aiChannel = channels.find(c => c.displayName === 'AI Assistant');
              if (aiChannel) {
                await teamsIntegration.default.sendAIContentToChannel(
                  teamsWorkspace.teamId,
                  aiChannel.id,
                  aiAnalysis
                );
                workflowResults.push('Shared AI analysis in Teams channel');
              }
            }
          }
        } catch (teamsError) {
          console.error('Teams integration error:', teamsError);
          workflowResults.push('[WARN] Teams workspace creation encountered issues (continuing...)');
        }
      }

    } catch (integrationError) {
      console.error('Integration workflow error:', integrationError);
      workflowResults.push('[WARN] Some AI/Teams features encountered issues (project created successfully)');
    }

    // Fetch complete project with associations
    const projectWithDetails = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePicture', 'subRoles'] }]
        },
        { 
          model: Task, 
          as: 'tasks',
          include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }]
        }
      ]
    });

    // Update project with Teams info if created
    if (teamsWorkspace) {
      await project.update({
        teamsId: teamsWorkspace.teamId,
        teamsUrl: teamsWorkspace.webUrl
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully with comprehensive workflow!',
      project: projectWithDetails,
      aiAnalysis,
      teamsWorkspace,
      workflowResults
    });
  } catch (error) {
    console.error('Error in comprehensive project creation:', error);
    next(error);
  }
};

export const updateProjectAIStatus = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { aiStatus, aiSuggestionId } = req.body;

    // Check if user can update projects
    if (req.user.role === 'user') {
      throw new AppError('Only Project Managers and Admins can update project AI status', 403);
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Update AI status
    const updateData = { aiStatus };
    if (aiSuggestionId !== undefined) {
      updateData.aiSuggestionId = aiSuggestionId;
    }
    
    await project.update(updateData);

    res.json({
      success: true,
      message: 'Project AI status updated successfully',
      data: { project }
    });

  } catch (error) {
    next(error);
  }
};

// Get AI suggestions by suggestionId
export const getAISuggestions = async (req, res, next) => {
  try {
    const { suggestionId } = req.params;

    // Read the suggestion file
    const suggestionPath = path.join(process.cwd(), 'ai-suggestions', `${suggestionId}.json`);
    
    if (!await fs.pathExists(suggestionPath)) {
      throw new AppError('AI suggestions not found', 404);
    }

    const suggestionData = await fs.readJSON(suggestionPath);

    res.json({
      success: true,
      data: suggestionData
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      next(new AppError('AI suggestions not found', 404));
    } else {
      next(error);
    }
  }
};

// Update AI suggestions by suggestionId
export const updateAISuggestions = async (req, res, next) => {
  try {
    const { suggestionId } = req.params;
    const { analysis } = req.body;

    if (!analysis) {
      throw new AppError('Analysis data is required', 400);
    }

    // Read the existing suggestion file
    const suggestionPath = path.join(process.cwd(), 'ai-suggestions', `${suggestionId}.json`);
    
    if (!await fs.pathExists(suggestionPath)) {
      throw new AppError('AI suggestions not found', 404);
    }

    const suggestionData = await fs.readJSON(suggestionPath);

    // Update the analysis data
    suggestionData.analysis = analysis;
    suggestionData.metadata.updatedAt = new Date().toISOString();

    // Save the updated data
    await fs.writeJSON(suggestionPath, suggestionData, { spaces: 2 });

    res.json({
      success: true,
      message: 'AI suggestions updated successfully',
      data: suggestionData
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      next(new AppError('AI suggestions not found', 404));
    } else {
      next(error);
    }
  }
};
