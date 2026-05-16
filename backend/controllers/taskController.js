// Task controller for PostgreSQL
// Handle task management operations

import { Task, Project, User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import { createNotification } from './notificationController.js';
import { sendNotificationToUser } from '../services/websocketService.js';
import teamsIntegrationService from '../services/teamsIntegrationService.js';

// Create new task
export const createTask = async (req, res, next) => {
  try {
    const { title, description, projectId, assignedToId, priority, dueDate, startDate, estimatedHours, tags } = req.body;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      projectId,
      assignedToId,
      createdById: req.user.id,
      priority,
      dueDate,
      startDate,
      estimatedHours: estimatedHours || 0,
      tags: tags || []
    });

    const taskWithDetails = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    // Create notification if task is assigned to someone
    if (assignedToId && assignedToId !== req.user.id) {
      await createNotification({
        userId: assignedToId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${title}`,
        relatedId: task.id,
        relatedType: 'task',
        priority: priority === 'high' || priority === 'urgent' ? 'high' : 'normal'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: taskWithDetails
    });
  } catch (error) {
    next(error);
  }
};

// Get all tasks with filters
export const getAllTasks = async (req, res, next) => {
  try {
    const { status, priority, assignedToId, projectId, search } = req.query;
    
    const whereClause = {};

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedToId) whereClause.assignedToId = assignedToId;
    if (projectId) whereClause.projectId = projectId;
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks assigned to current user
export const getMyTasks = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const whereClause = {
      assignedToId: req.user.id
    };

    if (status) whereClause.status = status;

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks by project
export const getTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.findAll({
      where: { projectId },
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'profilePicture'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// Get task by ID
export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.taskId, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] }
      ]
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

// Update task
export const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, startDate, estimatedHours, actualHours, tags } = req.body;

    const task = await Task.findByPk(req.params.taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Update fields
    await task.update({
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
      ...(startDate && { startDate }),
      ...(estimatedHours !== undefined && { estimatedHours }),
      ...(actualHours !== undefined && { actualHours }),
      ...(tags && { tags })
    });

    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

// Delete task
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await task.destroy();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Assign task to user
export const assignTask = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const task = await Task.findByPk(req.params.taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await task.update({ assignedToId: userId });

    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'profilePicture'] }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Task assigned successfully',
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

// Update task status
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findByPk(req.params.taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const oldStatus = task.status;
    await task.update({ status });

    // Notify assigned user about status change
    if (task.assignedToId && task.assignedToId !== req.user.id) {
      const notification = await createNotification({
        userId: task.assignedToId,
        type: 'task_status_changed',
        title: 'Task Status Updated',
        message: `Task "${task.title}" status changed from ${oldStatus} to ${status}`,
        relatedId: task.id,
        relatedType: 'task'
      });
      sendNotificationToUser(task.assignedToId, notification);
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

// Add comment to task
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const task = await Task.findByPk(req.params.taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const comments = task.comments || [];
    comments.push({
      userId: req.user.id,
      userName: req.user.name,
      text,
      createdAt: new Date()
    });

    await task.update({ comments });

    // Notify assigned user about new comment (if not self-commenting)
    if (task.assignedToId && task.assignedToId !== req.user.id) {
      const notification = await createNotification({
        userId: task.assignedToId,
        type: 'task_comment',
        title: 'New Comment on Task',
        message: `${req.user.name} commented on task "${task.title}"`,
        relatedId: task.id,
        relatedType: 'task'
      });
      sendNotificationToUser(task.assignedToId, notification);
    }

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

// Sync task statuses from Microsoft Planner for a project
export const syncPlannerTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (!project.plannerPlanId) {
      return res.status(200).json({
        success: true,
        message: 'No Planner plan linked to this project',
        synced: 0
      });
    }

    // Fetch current Planner task statuses
    const plannerStatuses = await teamsIntegrationService.getPlannerTaskStatuses(project.plannerPlanId);
    console.log(`[Planner Sync] Fetched ${plannerStatuses.length} tasks from Planner plan ${project.plannerPlanId}`);

    // Find ALL local tasks for this project (not just those with teamsTaskId)
    const localTasks = await Task.findAll({
      where: { projectId }
    });
    console.log(`[Planner Sync] Found ${localTasks.length} local tasks for project ${projectId}`);

    let synced = 0;
    for (const localTask of localTasks) {
      // Match by teamsTaskId first, then fallback to title match
      let plannerTask = null;
      
      if (localTask.teamsTaskId) {
        plannerTask = plannerStatuses.find(pt => pt.plannerTaskId === localTask.teamsTaskId);
      }
      
      // Fallback: match by title if no teamsTaskId or no match found
      if (!plannerTask) {
        plannerTask = plannerStatuses.find(pt => 
          pt.title?.toLowerCase().trim() === localTask.title?.toLowerCase().trim()
        );
        // Backfill teamsTaskId for future syncs
        if (plannerTask && !localTask.teamsTaskId) {
          await localTask.update({ teamsTaskId: plannerTask.plannerTaskId });
          console.log(`[Planner Sync] Linked "${localTask.title}" -> teamsTaskId: ${plannerTask.plannerTaskId}`);
        }
      }

      if (plannerTask && plannerTask.status !== localTask.status) {
        await localTask.update({ status: plannerTask.status });
        synced++;
        console.log(`[Planner Sync] Updated "${localTask.title}": ${localTask.status} -> ${plannerTask.status}`);
      }
    }

    // Update project progress based on task statuses
    const allProjectTasks = await Task.findAll({ where: { projectId } });
    if (allProjectTasks.length > 0) {
      const completed = allProjectTasks.filter(t => t.status === 'completed').length;
      const inProgress = allProjectTasks.filter(t => t.status !== 'todo').length;
      const progress = Math.round((completed / allProjectTasks.length) * 100);
      const updates = { progress };

      // Auto-transition: planning -> active when tasks have activity
      if (project.status === 'planning' && inProgress > 0) {
        updates.status = 'active';
        console.log(`[Planner Sync] Project "${project.name}" auto-transitioned: planning -> active`);
      }

      await project.update(updates);

      // Notify owner when progress reaches 100% (project ready for completion approval)
      if (progress === 100 && project.status !== 'completed') {
        try {
          await createNotification({
            userId: project.ownerId,
            type: 'project_updated',
            title: 'Project Ready for Completion',
            message: `All tasks in "${project.name}" are completed. Review and mark the project as completed.`,
            relatedId: project.id,
            relatedType: 'project',
            priority: 'high'
          });
          console.log(`[Planner Sync] Notified owner about 100% completion for "${project.name}"`);
        } catch (notifErr) {
          console.error('Failed to send completion notification:', notifErr.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${synced} task(s) from Planner`,
      synced
    });
  } catch (error) {
    next(error);
  }
};

// Sync all tasks for the current user across all projects
export const syncAllMyPlannerTasks = async (req, res, next) => {
  try {
    // Find ALL tasks assigned to the user (not just those with teamsTaskId)
    const userTasks = await Task.findAll({
      where: { 
        assignedToId: req.user.id
      },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'plannerPlanId'] }
      ]
    });

    console.log(`[Planner Sync] Found ${userTasks.length} total tasks for user ${req.user.id}`);

    // Group by project plannerPlanId - only projects that have a Planner plan
    const planMap = {};
    for (const task of userTasks) {
      const planId = task.project?.plannerPlanId;
      if (!planId) continue;
      if (!planMap[planId]) {
        planMap[planId] = { projectId: task.project.id, projectName: task.project.name, tasks: [] };
      }
      planMap[planId].tasks.push(task);
    }

    const planIds = Object.keys(planMap);
    console.log(`[Planner Sync] Plan IDs to sync: ${planIds.join(', ') || 'NONE'}`);

    if (planIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No projects with Planner plans found',
        synced: 0
      });
    }

    let totalSynced = 0;
    const projectsToUpdate = new Set();
    
    for (const planId of planIds) {
      try {
        const plannerStatuses = await teamsIntegrationService.getPlannerTaskStatuses(planId);
        console.log(`[Planner Sync] Planner plan ${planId} has ${plannerStatuses.length} tasks:`);
        plannerStatuses.forEach(pt => {
          console.log(`  - Planner "${pt.title}" | id: ${pt.plannerTaskId} | status: ${pt.status}`);
        });
        
        for (const localTask of planMap[planId].tasks) {
          // Match by teamsTaskId first, then fallback to title match
          let plannerTask = null;
          
          if (localTask.teamsTaskId) {
            plannerTask = plannerStatuses.find(pt => pt.plannerTaskId === localTask.teamsTaskId);
          }
          
          // Fallback: match by title
          if (!plannerTask) {
            plannerTask = plannerStatuses.find(pt => 
              pt.title?.toLowerCase().trim() === localTask.title?.toLowerCase().trim()
            );
            // Backfill teamsTaskId for future syncs
            if (plannerTask && !localTask.teamsTaskId) {
              await localTask.update({ teamsTaskId: plannerTask.plannerTaskId });
              console.log(`[Planner Sync] Linked "${localTask.title}" -> teamsTaskId: ${plannerTask.plannerTaskId}`);
            }
          }

          if (plannerTask) {
            console.log(`[Planner Sync] Match: local "${localTask.title}" (${localTask.status}) <-> planner "${plannerTask.title}" (${plannerTask.status})`);
            if (plannerTask.status !== localTask.status) {
              await localTask.update({ status: plannerTask.status });
              totalSynced++;
              projectsToUpdate.add(localTask.projectId);
              console.log(`[Planner Sync] Updated "${localTask.title}": ${localTask.status} -> ${plannerTask.status}`);
            }
          } else {
            console.log(`[Planner Sync] NO MATCH for "${localTask.title}" (teamsTaskId: ${localTask.teamsTaskId || 'none'})`);
          }
        }
      } catch (syncErr) {
        console.error(`Failed to sync plan ${planId}:`, syncErr.message);
      }
    }

    // Update progress for affected projects and auto-transition status
    for (const projectId of projectsToUpdate) {
      const proj = await Project.findByPk(projectId);
      if (!proj) continue;
      const allProjectTasks = await Task.findAll({ where: { projectId } });
      if (allProjectTasks.length > 0) {
        const completed = allProjectTasks.filter(t => t.status === 'completed').length;
        const inProgress = allProjectTasks.filter(t => t.status !== 'todo').length;
        const progress = Math.round((completed / allProjectTasks.length) * 100);
        const updates = { progress };

        // Auto-transition: planning -> active when tasks have activity
        if (proj.status === 'planning' && inProgress > 0) {
          updates.status = 'active';
          console.log(`[Planner Sync] Project "${proj.name}" auto-transitioned: planning -> active`);
        }

        await proj.update(updates);

        // Notify owner when progress reaches 100%
        if (progress === 100 && proj.status !== 'completed') {
          try {
            await createNotification({
              userId: proj.ownerId,
              type: 'project_updated',
              title: 'Project Ready for Completion',
              message: `All tasks in "${proj.name}" are completed. Review and mark the project as completed.`,
              relatedId: proj.id,
              relatedType: 'project',
              priority: 'high'
            });
          } catch (notifErr) {
            console.error('Failed to send completion notification:', notifErr.message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${totalSynced} task(s) from Planner`,
      synced: totalSynced
    });
  } catch (error) {
    next(error);
  }
};
