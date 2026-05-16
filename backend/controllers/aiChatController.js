// AI Chat controller
// Handle conversational AI chat with full project context

import { AppError } from '../middleware/errorHandler.js';
import { Project, Task, ProjectMember, User, ChatMessage } from '../models/index.js';
import { generateCompletion } from '../services/geminiService.js';

// Build full project context string for AI
const buildProjectContext = async (projectId) => {
  const project = await Project.findByPk(projectId, {
    include: [
      { association: 'owner', attributes: ['id', 'name', 'email'] },
      {
        association: 'members',
        include: [{ association: 'user', attributes: ['id', 'name', 'email', 'role', 'bio'] }]
      }
    ]
  });

  if (!project) return null;

  const tasks = await Task.findAll({
    where: { projectId },
    include: [
      { association: 'assignedTo', attributes: ['id', 'name', 'email'] },
      { association: 'createdBy', attributes: ['id', 'name', 'email'] }
    ],
    order: [['createdAt', 'ASC']]
  });

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const overdueTasks = tasks.filter(t => t.dueDate && new Date() > new Date(t.dueDate) && t.status !== 'completed');

  const totalEstimated = tasks.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (parseFloat(t.actualHours) || 0), 0);

  const taskDetails = tasks.map(t => ({
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignedTo: t.assignedTo?.name || 'Unassigned',
    createdBy: t.createdBy?.name || 'Unknown',
    dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date',
    startDate: t.startDate ? new Date(t.startDate).toLocaleDateString() : 'Not set',
    estimatedHours: t.estimatedHours || 0,
    actualHours: t.actualHours || 0,
    tags: t.tags || [],
    aiGenerated: t.aiGenerated
  }));

  const memberDetails = (project.members || []).map(m => ({
    name: m.user?.name || 'Unknown',
    email: m.user?.email || '',
    projectRole: m.role,
    systemRole: m.user?.role || '',
    bio: m.user?.bio || ''
  }));

  const context = `
PROJECT INFORMATION:
- Name: ${project.name}
- Description: ${project.description}
- Status: ${project.status}
- Priority: ${project.priority}
- Progress: ${project.progress}%
- Start Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
- End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
- Budget: ${project.budget || 'Not set'}
- Tags: ${(project.tags || []).join(', ') || 'None'}
- Owner: ${project.owner?.name || 'Unknown'} (${project.owner?.email || ''})

TEAM MEMBERS (${memberDetails.length}):
${memberDetails.map(m => `- ${m.name} (${m.email}) — Role: ${m.projectRole}, Bio: ${m.bio || 'N/A'}`).join('\n')}

TASK SUMMARY:
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- In Progress: ${inProgressTasks.length}
- To Do: ${todoTasks.length}
- In Review: ${reviewTasks.length}
- Blocked: ${blockedTasks.length}
- Overdue: ${overdueTasks.length}
- Total Estimated Hours: ${totalEstimated}
- Total Actual Hours: ${totalActual}

ALL TASKS:
${taskDetails.map((t, i) => `${i + 1}. [${t.status.toUpperCase()}] "${t.title}" — Priority: ${t.priority}, Assigned: ${t.assignedTo}, Due: ${t.dueDate}, Est: ${t.estimatedHours}h, Actual: ${t.actualHours}h${t.tags.length ? ', Tags: ' + t.tags.join(', ') : ''}
   Description: ${t.description || 'No description'}`).join('\n')}
`;

  return { context, project };
};

// Chat with AI about a project
export const chatWithProject = async (req, res, next) => {
  try {
    const { projectId, message } = req.body;
    const userId = req.user.id;

    if (!projectId) {
      throw new AppError('Project ID is required', 400);
    }
    if (!message) {
      throw new AppError('Message is required', 400);
    }

    const result = await buildProjectContext(projectId);
    if (!result) {
      throw new AppError('Project not found', 404);
    }

    const { context, project } = result;

    // Save user message to database
    await ChatMessage.create({
      projectId,
      userId,
      role: 'user',
      content: message
    });

    // Load conversation history from database (last 20 messages)
    const dbHistory = await ChatMessage.findAll({
      where: { projectId, userId },
      order: [['createdAt', 'ASC']],
      attributes: ['role', 'content'],
      limit: 20,
      offset: Math.max(0, await ChatMessage.count({ where: { projectId, userId } }) - 20)
    });

    // Build conversation history for context
    let conversationHistory = '';
    if (dbHistory.length > 0) {
      // Exclude the last message (current user message) from "previous" history
      const previousMessages = dbHistory.slice(0, -1);
      if (previousMessages.length > 0) {
        conversationHistory = '\nPREVIOUS CONVERSATION:\n' +
          previousMessages.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') +
          '\n';
      }
    }

    const prompt = `You are an AI project management assistant. You have full access to the following project data. Answer the user's question helpfully, accurately, and concisely based on this project information.

${context}
${conversationHistory}
User's question: ${message}

Respond in a helpful, conversational tone. If the question is about specific data from the project, cite the relevant details. If asked for suggestions, base them on the actual project state. Use markdown formatting for readability when appropriate.`;

    const response = await generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 3000
    });

    // Response might be parsed JSON or a string
    const aiMessage = typeof response === 'string' ? response : JSON.stringify(response, null, 2);

    // Save AI response to database
    await ChatMessage.create({
      projectId,
      userId,
      role: 'assistant',
      content: aiMessage
    });

    res.status(200).json({
      success: true,
      message: aiMessage,
      projectName: project.name
    });
  } catch (error) {
    next(error);
  }
};

// Get project list for chat selector (lightweight)
export const getProjectsForChat = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get projects where user is owner or member
    const projectAttrs = ['id', 'name', 'description', 'status', 'priority', 'progress', 'startDate', 'endDate'];

    const ownedProjects = await Project.findAll({
      where: { ownerId: userId },
      attributes: projectAttrs,
      order: [['updatedAt', 'DESC']]
    });

    const memberProjects = await ProjectMember.findAll({
      where: { userId },
      include: [{
        model: Project,
        attributes: projectAttrs
      }]
    });

    // Merge and deduplicate
    const projectMap = new Map();
    ownedProjects.forEach(p => projectMap.set(p.id, p.toJSON()));
    memberProjects.forEach(pm => {
      if (pm.Project && !projectMap.has(pm.Project.id)) {
        projectMap.set(pm.Project.id, pm.Project.toJSON());
      }
    });

    // Add hasHistory flag for each project
    const projects = await Promise.all(
      Array.from(projectMap.values()).map(async (p) => {
        const messageCount = await ChatMessage.count({
          where: { projectId: p.id, userId }
        });
        return { ...p, hasHistory: messageCount > 0 };
      })
    );

    res.status(200).json({
      success: true,
      projects
    });
  } catch (error) {
    next(error);
  }
};

// Get chat history for a project
export const getChatHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const messages = await ChatMessage.findAll({
      where: { projectId, userId },
      attributes: ['id', 'role', 'content', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Clear chat history for a project
export const clearChatHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    await ChatMessage.destroy({
      where: { projectId, userId }
    });

    res.status(200).json({
      success: true,
      message: 'Chat history cleared'
    });
  } catch (error) {
    next(error);
  }
};
