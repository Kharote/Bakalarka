// AI controller
// Handle AI-powered project management suggestions using Google Gemini

import { AppError } from '../middleware/errorHandler.js';
import { Project, Task } from '../models/index.js';
import { generateCompletion, analyzeText } from '../services/geminiService.js';

// Generate comprehensive project plan using AI
export const generateProjectPlan = async (req, res, next) => {
  try {
    const { projectName, description, goals, duration } = req.body;

    if (!projectName || !description) {
      throw new AppError('Project name and description are required', 400);
    }

    const prompt = `
      Create a comprehensive project plan for:
      Project Name: ${projectName}
      Description: ${description}
      Goals: ${goals || 'Not specified'}
      Duration: ${duration || 'Not specified'}
      
      Please provide:
      1. Key milestones
      2. Suggested task breakdown
      3. Resource requirements
      4. Potential risks
      5. Timeline recommendations
      
      Format the response in JSON with these sections.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Project plan generated successfully',
      plan: response
    });
  } catch (error) {
    next(error);
  }
};

// Suggest tasks for a project using AI
export const suggestTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const existingTasks = await Task.find({ project: projectId });
    const taskTitles = existingTasks.map(t => t.title).join(', ');

    const prompt = `
      Based on this project information:
      Name: ${project.name}
      Description: ${project.description}
      Existing Tasks: ${taskTitles || 'None'}
      
      Suggest 5-10 additional tasks that would help complete this project.
      For each task provide: title, description, estimated hours, and priority.
      Format as JSON array.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Task suggestions generated successfully',
      suggestions: response
    });
  } catch (error) {
    next(error);
  }
};

// Analyze project risks using AI
export const analyzeProjectRisks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const tasks = await Task.find({ project: projectId });
    const overdueTasks = tasks.filter(t => t.dueDate && new Date() > t.dueDate && t.status !== 'completed');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');

    const prompt = `
      Analyze risks for this project:
      Name: ${project.name}
      Status: ${project.status}
      Priority: ${project.priority}
      Total Tasks: ${tasks.length}
      Overdue Tasks: ${overdueTasks.length}
      Blocked Tasks: ${blockedTasks.length}
      Progress: ${project.progress}%
      
      Identify:
      1. Current risks
      2. Potential future risks
      3. Mitigation strategies
      4. Priority ranking
      
      Format as JSON with risk assessment.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Risk analysis completed',
      analysis: response
    });
  } catch (error) {
    next(error);
  }
};

// Optimize resource allocation using AI
export const optimizeResourceAllocation = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('members.user', 'name email');

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name');

    const unassignedTasks = tasks.filter(t => !t.assignedTo);
    const tasksByMember = {};

    tasks.forEach(task => {
      if (task.assignedTo) {
        const memberName = task.assignedTo.name;
        if (!tasksByMember[memberName]) {
          tasksByMember[memberName] = [];
        }
        tasksByMember[memberName].push(task.title);
      }
    });

    const prompt = `
      Optimize resource allocation for this project:
      Team Members: ${project.members.length}
      Total Tasks: ${tasks.length}
      Unassigned Tasks: ${unassignedTasks.length}
      
      Current allocation:
      ${JSON.stringify(tasksByMember, null, 2)}
      
      Provide recommendations for:
      1. Balancing workload
      2. Assigning unassigned tasks
      3. Identifying overloaded team members
      4. Suggested reassignments
      
      Format as JSON.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Resource optimization completed',
      recommendations: response
    });
  } catch (error) {
    next(error);
  }
};

// Predict project timeline using AI
export const predictProjectTimeline = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const tasks = await Task.find({ project: projectId });
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + t.actualHours, 0);

    const prompt = `
      Predict project completion timeline:
      Project: ${project.name}
      Start Date: ${project.startDate}
      Planned End Date: ${project.endDate}
      Current Progress: ${project.progress}%
      Total Tasks: ${tasks.length}
      Completed Tasks: ${completedTasks.length}
      Estimated Hours: ${totalEstimatedHours}
      Actual Hours: ${totalActualHours}
      
      Provide:
      1. Predicted completion date
      2. Likelihood of on-time delivery
      3. Factors affecting timeline
      4. Recommendations to stay on track
      
      Format as JSON.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Timeline prediction completed',
      prediction: response
    });
  } catch (error) {
    next(error);
  }
};

// Generate task description using AI
export const generateTaskDescription = async (req, res, next) => {
  try {
    const { title, context } = req.body;

    if (!title) {
      throw new AppError('Task title is required', 400);
    }

    const prompt = `
      Generate a detailed task description for:
      Title: ${title}
      Context: ${context || 'General project management task'}
      
      Include:
      1. Detailed description
      2. Acceptance criteria
      3. Potential subtasks
      4. Estimated complexity
      
      Format as JSON.
    `;

    const response = await generateCompletion(prompt);

    res.status(200).json({
      success: true,
      message: 'Task description generated',
      description: response
    });
  } catch (error) {
    next(error);
  }
};

// Analyze sentiment of project comments or feedback
export const analyzeSentiment = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      throw new AppError('Text is required for analysis', 400);
    }

    const analysis = await analyzeText(text);

    res.status(200).json({
      success: true,
      message: 'Sentiment analysis completed',
      analysis
    });
  } catch (error) {
    next(error);
  }
};
