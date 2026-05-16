// OpenWebUI AI service for project planning and analysis
// Generates tasks, risks, and timeline based on project data

import { OPENWEBUI_API_URL, OPENWEBUI_API_KEY } from '../config/openwebuiConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import promptLoaderService from './promptLoaderService.js';
import { getSetting } from './systemSettingsService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy load ganttChartGenerator to avoid crashing if canvas is not installed
let ganttChartGenerator = null;
let ganttGeneratorError = null;

async function loadGanttGenerator() {
  if (ganttChartGenerator) return ganttChartGenerator;
  if (ganttGeneratorError) throw ganttGeneratorError;
  
  try {
    const module = await import('./ganttChartGenerator.js');
    ganttChartGenerator = module.default;
    return ganttChartGenerator;
  } catch (error) {
    ganttGeneratorError = error;
    console.warn('[WARN] Gantt chart generator not available:', error.message);
    throw new AppError('Gantt chart image generation is not available. Canvas package is not installed.', 500);
  }
}

class OpenWebUIProjectService {
  constructor() {
    this.apiUrl = OPENWEBUI_API_URL;
    this.apiKey = OPENWEBUI_API_KEY;
    this.defaultModel = process.env.OPENWEBUI_DEFAULT_MODEL || null;
    this.currentModel = this.defaultModel;
  }

  // Get list of available models from OpenWebUI
  async getAvailableModels() {
    try {
      console.log('Fetching available models from OpenWebUI...');
      
      const response = await fetch(`${this.apiUrl}/api/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform OpenWebUI models to our format
      const models = (data.data || data.models || []).map(model => ({
        name: model.id || model.name,
        displayName: model.name || model.id,
        description: model.description || `Model: ${model.id || model.name}`,
        inputTokenLimit: model.max_input_tokens || 8192,
        outputTokenLimit: model.max_output_tokens || 4096
      }));

      console.log(`Available OpenWebUI models:`, models.map(m => m.name));
      return models;
    } catch (error) {
      console.warn('OpenWebUI unreachable, returning configured default:', error.message);
      // Return the configured default model so the UI stays functional
      const modelSetting = await getSetting('ai.openwebui.model').catch(() => null);
      const defaultModel = modelSetting?.model || this.defaultModel || 'llama3.1:latest';
      return [{
        name: defaultModel,
        displayName: defaultModel,
        description: 'OpenWebUI unavailable — using configured default model',
        inputTokenLimit: 4096,
        outputTokenLimit: 4096
      }];
    }
  }

  // Set model for this session
  setModel(modelName) {
    console.log(`Switching to OpenWebUI model: ${modelName}`);
    this.currentModel = modelName;
  }

  // Generate content using OpenWebUI API
  async generateContent(prompt, model = null) {
    const selectedModel = model || this.currentModel || this.defaultModel;
    
    if (!selectedModel) {
      throw new AppError('No model selected for OpenWebUI', 400);
    }

    // Read maxTokens from admin settings (temperature not supported by OpenWebUI models)
    let maxTokens = 4096;
    try {
      const [tokensSetting, modelSetting] = await Promise.all([
        getSetting('ai.maxTokens'),
        getSetting('ai.openwebui.model')
      ]);
      if (tokensSetting?.maxTokens !== undefined) maxTokens = tokensSetting.maxTokens;
      if (modelSetting?.model && !model && !this.currentModel) {
        this.defaultModel = modelSetting.model;
      }
    } catch { /* use defaults */ }

    try {
      console.log(`Generating content with OpenWebUI model: ${selectedModel}`);
      
      const response = await fetch(`${this.apiUrl}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenWebUI API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract content from response
      const content = data.choices?.[0]?.message?.content || data.message?.content || '';
      
      return {
        text: () => content,
        response: {
          text: () => content
        }
      };
    } catch (error) {
      console.error('Error generating content with OpenWebUI:', error);
      throw new AppError(`Failed to generate content: ${error.message}`, 500);
    }
  }

  // Generate comprehensive project analysis
  async generateProjectAnalysis(projectData, teamMembers) {
    try {
      const analysis = {};

      // Generate tasks if requested
      if (projectData.generateTasks) {
        analysis.tasks = await this.generateProjectTasks(projectData, teamMembers);
      }

      // Generate risk analysis if requested
      if (projectData.generateRisks) {
        analysis.risks = await this.generateRiskAnalysis(projectData);
      }

      // Generate timeline if requested
      if (projectData.generateGantt) {
        analysis.timeline = await this.generateTimeline(projectData);
        analysis.ganttChart = await this.generateGanttChart(projectData, analysis.tasks);
      }

      return analysis;
    } catch (error) {
      console.error('Error generating project analysis:', error);
      throw new AppError('Failed to generate AI project analysis', 500);
    }
  }

  // Generate project tasks based on team skills
  async generateProjectTasks(projectData, teamMembers, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }
    
    // Build detailed team information
    const teamInfo = teamMembers.map(member => ({
      name: member.name,
      email: member.email,
      subRoles: member.subRoles || [],
      bio: member.bio || '',
      skills: this.mapSubRolesToSkills(member.subRoles || [])
    }));

    const teamDetails = teamInfo.map(member => {
      const bioSection = member.bio ? `\n  Biography/Experience: ${member.bio}` : '';
      return `- ${member.name} (${member.email}): ${member.subRoles.join(', ')} - Skills: ${member.skills.join(', ')}${bioSection}`;
    }).join('\n');

    const totalHours = this.calculateAvailableHours(projectData.startDate, projectData.endDate, teamMembers.length);
    const budgetPerHour = projectData.budget > 0 && totalHours > 0 
      ? (projectData.budget / totalHours).toFixed(2) 
      : 0;

    const duration = Math.ceil(
      (new Date(projectData.endDate) - new Date(projectData.startDate)) / (1000 * 60 * 60 * 24)
    );

    const locale = projectData.locale || 'en';

    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      duration: duration,
      priority: projectData.priority || 'Medium',
      priorityGuidelines: this.getPriorityGuidelines(projectData.priority),
      budget: projectData.budget || 0,
      budgetPerHour: budgetPerHour,
      totalHours: totalHours,
      tags: (projectData.tags || []).join(', '),
      teamDetails: teamDetails,
      priorityTaskGuidance: this.getPriorityTaskGuidance(projectData.priority)
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('project-tasks', promptData, locale);
    } catch (error) {
      console.error('Error loading prompt template:', error);
      throw new AppError('Failed to load AI prompt template', 500);
    }

    const result = await this.generateContent(prompt);
    const text = result.text();

    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const tasks = parsed.tasks || [];
        const summary = parsed.summary || {};
        
        // Calculate summary if not provided or incomplete
        const calculatedSummary = this.calculateTaskSummary(tasks, projectData.budget);
        
        return {
          tasks: tasks,
          summary: {
            ...calculatedSummary,
            ...summary // AI summary can override calculated values
          }
        };
      }
    } catch (parseError) {
      console.error('Error parsing tasks JSON:', parseError);
    }

    // Fallback: parse tasks manually if JSON parsing fails
    const tasks = this.parseTasks(text);
    return {
      tasks: tasks,
      summary: this.calculateTaskSummary(tasks, projectData.budget)
    };
  }

  // Generate risk analysis
  async generateRiskAnalysis(projectData, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }

    const locale = projectData.locale || 'en';

    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      priority: projectData.priority || 'Medium',
      budget: projectData.budget || 0,
      tags: (projectData.tags || []).join(', ')
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('risk-analysis', promptData, locale);
    } catch (error) {
      console.error('Error loading prompt template:', error);
      throw new AppError('Failed to load AI prompt template', 500);
    }

    const result = await this.generateContent(prompt);
    const text = result.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : parsed.risks || [];
      }
    } catch (parseError) {
      console.error('Error parsing risks JSON:', parseError);
    }

    return this.parseRisks(text);
  }

  // Generate project timeline
  async generateTimeline(projectData, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }

    const locale = projectData.locale || 'en';

    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      priority: projectData.priority || 'Medium',
      budget: projectData.budget || 0
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('timeline', promptData, locale);
    } catch (error) {
      console.error('Error loading prompt template:', error);
      throw new AppError('Failed to load AI prompt template', 500);
    }

    const result = await this.generateContent(prompt);
    const text = result.text();

    // Timeline returns markdown text — return it as-is
    return text || '';
  }

  // Generate Gantt chart representation
  async generateGanttChart(projectData, tasks, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }

    const locale = projectData.locale || 'en';

    // Format tasks for the prompt (same format as Gemini service)
    const tasksInfo = (tasks || []).map(task => {
      const assignee = typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo?.name || 'Unassigned');
      return `- ${task.name} (${assignee}) - ${task.estimatedHours || 0}h - Due: ${task.dueDate || 'Not set'}`;
    }).join('\n');

    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const promptData = {
      projectName: projectData.name,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      duration: totalDays,
      tasksInfo: tasksInfo
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('gantt-chart-json', promptData, locale);
    } catch (error) {
      console.error('Error loading prompt template:', error);
      throw new AppError('Failed to load AI prompt template', 500);
    }

    const result = await this.generateContent(prompt);
    const text = result.text();

    let ganttData = null;
    try {
      let cleanedText = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ganttData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Gantt chart JSON:', parseError.message);
      console.error('Response text (first 500 chars):', text.substring(0, 500));
    }

    // If parsing failed, build fallback from task data
    if (!ganttData) {
      console.log('Building fallback Gantt chart from task data...');
      ganttData = this._buildFallbackGanttData(projectData, tasks);
    }

    // Try to generate image
    try {
      const timestamp = Date.now();
      const projectId = projectData.id
        || (projectData.name ? projectData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30) : null)
        || 'projekt';
      const filename = `gantt_${projectId}_${timestamp}.png`;
      const outputPath = path.join(__dirname, '..', 'public', 'gantt-charts', filename);

      const generator = await loadGanttGenerator();
      await generator.generateChart(ganttData, outputPath);
      return {
        success: true,
        imagePath: `/gantt-charts/${filename}`,
        data: ganttData
      };
    } catch (imgError) {
      console.error('[ERROR] Gantt chart image generation failed:', imgError.message);
      return {
        success: true,
        imagePath: null,
        data: ganttData,
        warning: `Gantt chart image generation failed: ${imgError.message}`
      };
    }
  }

  // Build a fallback Gantt chart from existing task data when AI parsing fails
  // Uses 8-hour workdays and resource leveling (one person can't work on parallel tasks)
  _buildFallbackGanttData(projectData, tasks) {
    const HOURS_PER_DAY = 8;
    const phaseColors = {
      'Planning': '#3b82f6',
      'Development': '#10b981',
      'Testing': '#f59e0b',
      'Deployment': '#8b5cf6'
    };

    const projectStart = new Date(projectData.startDate);
    const projectEnd = new Date(projectData.endDate);

    // Track next available date per assignee for resource leveling
    const assigneeNextAvailable = {};

    // Helper: add work days (skip weekends)
    const addWorkDays = (startDate, days) => {
      const result = new Date(startDate);
      let added = 0;
      while (added < days) {
        result.setDate(result.getDate() + 1);
        const dow = result.getDay();
        if (dow !== 0 && dow !== 6) {
          added++;
        }
      }
      return result;
    };

    const ganttTasks = (tasks || []).map((task, idx) => {
      const estimatedHours = task.estimatedHours || 8;
      const durationDays = Math.max(1, Math.ceil(estimatedHours / HOURS_PER_DAY));
      const assignee = typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo?.name || 'Unassigned');
      const phase = task.phase || 'Development';

      // Resource leveling: determine start date based on assignee availability
      let taskStart;
      if (assigneeNextAvailable[assignee] && assigneeNextAvailable[assignee] > projectStart) {
        taskStart = new Date(assigneeNextAvailable[assignee]);
      } else {
        taskStart = new Date(projectStart);
      }

      // Calculate end date by adding work days
      const taskEnd = addWorkDays(taskStart, durationDays);

      // Clamp to project bounds
      if (taskEnd > projectEnd) {
        taskEnd.setTime(projectEnd.getTime());
      }

      // Update assignee's next available date
      const nextDay = new Date(taskEnd);
      nextDay.setDate(nextDay.getDate() + 1);
      assigneeNextAvailable[assignee] = nextDay;

      return {
        id: `task-${idx + 1}`,
        name: task.name || `Task ${idx + 1}`,
        assignee: assignee,
        startDate: taskStart.toISOString().split('T')[0],
        endDate: taskEnd.toISOString().split('T')[0],
        duration: durationDays,
        estimatedHours: estimatedHours,
        progress: 0,
        phase: phase,
        dependencies: [],
        color: phaseColors[phase] || '#6366f1'
      };
    });

    return {
      projectName: projectData.name,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      tasks: ganttTasks,
      milestones: [
        { name: 'Project Start', date: projectData.startDate, description: 'Project kickoff' },
        { name: 'Project End', date: projectData.endDate, description: 'Target completion' }
      ]
    };
  }

  // Map sub-roles to specific skills (same as Gemini)
  mapSubRolesToSkills(subRoles) {
    const skillMap = {
      'frontend_developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue.js'],
      'backend_developer': ['Node.js', 'Python', 'Java', 'APIs', 'Databases'],
      'fullstack_developer': ['Frontend', 'Backend', 'APIs', 'Databases'],
      'mobile_developer': ['iOS', 'Android', 'React Native', 'Flutter'],
      'devops': ['CI/CD', 'Docker', 'Kubernetes', 'AWS', 'Azure'],
      'ui_ux_designer': ['Figma', 'Adobe XD', 'User Research', 'Wireframing'],
      'qa_tester': ['Testing', 'Selenium', 'Jest', 'Bug Tracking'],
      'data_analyst': ['SQL', 'Python', 'Excel', 'Data Visualization'],
      'project_manager': ['Planning', 'Agile', 'Scrum', 'Team Management'],
      'business_analyst': ['Requirements', 'Documentation', 'Stakeholder Management']
    };

    const skills = new Set();
    subRoles.forEach(role => {
      const roleSkills = skillMap[role] || [];
      roleSkills.forEach(skill => skills.add(skill));
    });

    return Array.from(skills);
  }

  // Calculate available work hours (same as Gemini)
  calculateAvailableHours(startDate, endDate, teamSize) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const workingDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const hoursPerDay = 6;
    return workingDays * hoursPerDay * teamSize;
  }

  // Get priority guidelines (same as Gemini)
  getPriorityGuidelines(priority) {
    const guidelines = {
      'Critical': 'Highest priority - requires immediate action and full team focus',
      'High': 'High priority - needs prompt attention and regular progress updates',
      'Medium': 'Standard priority - follow normal development timeline',
      'Low': 'Lower priority - can be addressed after higher priority items'
    };
    return guidelines[priority] || guidelines['Medium'];
  }

  // Get priority task guidance (same as Gemini)
  getPriorityTaskGuidance(priority) {
    const guidance = {
      'Critical': 'Focus on core functionality only. Break tasks into 4-8 hour increments for rapid iteration.',
      'High': 'Balance speed with quality. Task estimates should range 8-16 hours.',
      'Medium': 'Standard development pace. Tasks can be 16-32 hours for complex features.',
      'Low': 'Relaxed timeline. Tasks can be larger (32-40 hours) with thorough planning.'
    };
    return guidance[priority] || guidance['Medium'];
  }

  // Calculate task summary from generated tasks (same as Gemini)
  calculateTaskSummary(tasks, budget = 0) {
    if (!tasks || tasks.length === 0) {
      return {
        totalHours: 0,
        budgetUtilization: '0%',
        teamUtilization: {}
      };
    }

    const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    let budgetUtilization = '0%';
    if (budget > 0 && totalHours > 0) {
      const estimatedCost = totalHours * 50;
      const utilization = Math.min(100, Math.round((estimatedCost / budget) * 100));
      budgetUtilization = `${utilization}%`;
    }

    const teamUtilization = {};
    tasks.forEach(task => {
      const assignee = task.assignedTo || 'Unassigned';
      if (!teamUtilization[assignee]) {
        teamUtilization[assignee] = 0;
      }
      teamUtilization[assignee] += task.estimatedHours || 0;
    });

    return {
      totalHours,
      budgetUtilization,
      teamUtilization
    };
  }

  // Parse tasks from text (fallback) - same as Gemini
  parseTasks(text) {
    const tasks = [];
    const taskPattern = /Task \d+:|Task:|###\s+/gi;
    const sections = text.split(taskPattern).filter(s => s.trim());

    sections.forEach(section => {
      const task = {
        name: '',
        description: '',
        assignedTo: 'Unassigned',
        assignedRole: '',
        estimatedHours: 8,
        priority: 'Medium',
        phase: 'Development',
        tags: [],
        requiredSkills: []
      };

      const lines = section.split('\n');
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('name:') || lower.includes('title:')) {
          task.name = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('description:')) {
          task.description = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('assigned') && lower.includes('to')) {
          task.assignedTo = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('hours') || lower.includes('estimate')) {
          const hours = parseInt(line.match(/\d+/)?.[0]);
          if (hours) task.estimatedHours = hours;
        } else if (lower.includes('priority')) {
          const priority = line.split(':').slice(1).join(':').trim();
          task.priority = priority.charAt(0).toUpperCase() + priority.slice(1);
        }
      });

      if (task.name) {
        tasks.push(task);
      }
    });

    return tasks;
  }

  // Parse risks from text (fallback) - same as Gemini
  parseRisks(text) {
    const risks = [];
    const riskPattern = /Risk \d+:|###\s+/gi;
    const sections = text.split(riskPattern).filter(s => s.trim());

    sections.forEach(section => {
      const risk = {
        category: 'General',
        description: '',
        probability: 'Medium',
        impact: 'Medium',
        mitigation: ''
      };

      const lines = section.split('\n');
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('category:')) {
          risk.category = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('description:')) {
          risk.description = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('probability:')) {
          risk.probability = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('impact:')) {
          risk.impact = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('mitigation:')) {
          risk.mitigation = line.split(':').slice(1).join(':').trim();
        }
      });

      if (risk.description) {
        risks.push(risk);
      }
    });

    return risks;
  }

  // Parse timeline from text (fallback) - same as Gemini
  parseTimeline(text) {
    const phases = [];
    const phasePattern = /Phase \d+:|###\s+/gi;
    const sections = text.split(phasePattern).filter(s => s.trim());

    sections.forEach(section => {
      const phase = {
        name: '',
        duration: '',
        description: '',
        deliverables: []
      };

      const lines = section.split('\n');
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('name:') || lower.includes('phase:')) {
          phase.name = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('duration:')) {
          phase.duration = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('description:')) {
          phase.description = line.split(':').slice(1).join(':').trim();
        } else if (lower.includes('deliverable')) {
          const deliverable = line.split(':').slice(1).join(':').trim();
          if (deliverable) phase.deliverables.push(deliverable);
        }
      });

      if (phase.name) {
        phases.push(phase);
      }
    });

    return phases;
  }
}

// Create singleton instance
const openwebuiProjectService = new OpenWebUIProjectService();

export default openwebuiProjectService;
