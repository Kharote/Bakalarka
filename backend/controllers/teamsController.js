// Teams controller
// Handle Microsoft Teams integration operations

import { Project } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import * as teamsService from '../services/teamsService.js';

// Create Teams channel for project
export const createTeamsChannel = async (req, res, next) => {
  try {
    const { teamId, channelName, description } = req.body;
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Create channel in Teams
    const channel = await teamsService.createChannel(
      teamId,
      channelName || project.name,
      description || project.description
    );

    // Update project with Teams channel ID
    project.teamsChannelId = channel.id;
    await project.save();

    res.status(201).json({
      success: true,
      message: 'Teams channel created successfully',
      channel
    });
  } catch (error) {
    next(error);
  }
};

// Send message to Teams channel
export const sendTeamsMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const project = await Project.findByPk(req.params.projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (!project.teamsChannelId) {
      throw new AppError('Project does not have a Teams channel', 400);
    }

    const result = await teamsService.sendChannelMessage(
      project.teamsChannelId,
      message,
      req.user.name
    );

    res.status(200).json({
      success: true,
      message: 'Message sent to Teams',
      result
    });
  } catch (error) {
    next(error);
  }
};

// Create task in Microsoft Planner
export const createTeamsTask = async (req, res, next) => {
  try {
    const { planId, title, dueDateTime, assignments } = req.body;

    if (!planId || !title) {
      throw new AppError('Plan ID and title are required', 400);
    }

    const task = await teamsService.createPlannerTask(planId, {
      title,
      dueDateTime,
      assignments
    });

    res.status(201).json({
      success: true,
      message: 'Task created in Teams Planner',
      task
    });
  } catch (error) {
    next(error);
  }
};

// Update task in Microsoft Planner
export const updateTeamsTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await teamsService.updatePlannerTask(taskId, updates);

    res.status(200).json({
      success: true,
      message: 'Task updated in Teams Planner',
      task
    });
  } catch (error) {
    next(error);
  }
};

// Sync local task with Teams Planner
export const syncTaskWithTeams = async (req, res, next) => {
  try {
    const { taskId, plannerTaskId } = req.body;

    // This would involve bidirectional sync logic
    // For now, just acknowledge the sync request
    res.status(200).json({
      success: true,
      message: 'Task sync with Teams initiated',
      taskId,
      plannerTaskId
    });
  } catch (error) {
    next(error);
  }
};

// Get Teams channels for user
export const getTeamsChannels = async (req, res, next) => {
  try {
    // Get user's access token from database
    const teams = await teamsService.getUserTeams(req.user.azureAdToken);

    res.status(200).json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks from Microsoft Planner
export const getTeamsTasks = async (req, res, next) => {
  try {
    const { planId } = req.query;

    if (!planId) {
      throw new AppError('Plan ID is required', 400);
    }

    const tasks = await teamsService.getPlannerTasks(planId);

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};
