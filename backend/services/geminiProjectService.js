// Gemini AI service for project planning and analysis
// Generates tasks, risks, and timeline based on project data

import { GoogleGenerativeAI } from '@google/generative-ai';
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

class GeminiProjectService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: this.defaultModel });
  }

  // Get generation config from admin system settings (DB)
  async getGenerationConfig() {
    try {
      const [tempSetting, tokensSetting, modelSetting] = await Promise.all([
        getSetting('ai.temperature'),
        getSetting('ai.maxTokens'),
        getSetting('ai.gemini.model')
      ]);
      const config = {};
      if (tempSetting?.temperature !== undefined) config.temperature = tempSetting.temperature;
      if (tokensSetting?.maxTokens !== undefined) config.maxOutputTokens = tokensSetting.maxTokens;
      // Also update default model if admin changed it
      if (modelSetting?.model && modelSetting.model !== this.defaultModel) {
        this.defaultModel = modelSetting.model;
        this.model = this.genAI.getGenerativeModel({ model: this.defaultModel });
      }
      return Object.keys(config).length > 0 ? config : undefined;
    } catch {
      return undefined;
    }
  }

  // Generate content with admin-configured parameters
  async generate(prompt, forceJson = false) { // forceJson kept for API compat, responseMimeType not supported by this model
    const generationConfig = await this.getGenerationConfig();
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: generationConfig || undefined
    });
    return result;
  }

  // Get list of available models
  async getAvailableModels() {
    try {
      console.log('Providing available Gemini models...');
      
      // Return the actual working models from the API
      const contentModels = [
        {
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          description: 'Fast and efficient model for most tasks',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192
        },
        {
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          description: 'Most capable model for complex reasoning tasks',
          inputTokenLimit: 2097152,
          outputTokenLimit: 8192
        },
        {
          name: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          description: 'Previous generation fast model',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192
        }
      ];
      
      console.log(`Available models:`, contentModels.map(m => m.name));
      return contentModels;
    } catch (error) {
      console.error('Error providing available models:', error);
      // Return fallback models if there's any issue
      return [
        {
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          description: 'Fast and efficient model for most tasks',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192
        }
      ];
    }
  }

  // Set model for this session
  setModel(modelName) {
    console.log(`Switching to model: ${modelName}`);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
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

      // Generate Gantt chart if requested
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
    const budgetPerHour = projectData.budget ? Math.round(projectData.budget / totalHours) : null;

    // Load prompt template based on project locale
    const locale = projectData.locale || 'en';
    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      duration: this.calculateDuration(projectData.startDate, projectData.endDate),
      priority: projectData.priority,
      priorityGuidelines: this.getPriorityGuidelines(projectData.priority),
      budget: projectData.budget || 'Not specified',
      budgetPerHour: budgetPerHour || 'Not calculated',
      totalHours: totalHours,
      tags: projectData.tags?.join(', ') || 'None',
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

    const result = await this.generate(prompt, true); // forceJson=true
    const response = result.response;
    const text = response.text();

    const parsed = this.safeParseJSON(text);
    if (parsed && parsed.tasks && parsed.tasks.length > 0) {
      const calculatedSummary = this.calculateTaskSummary(parsed.tasks, projectData.budget);
      return {
        tasks: parsed.tasks,
        summary: { ...calculatedSummary, ...(parsed.summary || {}) }
      };
    }

    // Fallback: parse tasks manually if JSON parsing fails
    console.warn('[AI] JSON parse failed for tasks, using text fallback');
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
    
    // Load prompt template based on project locale
    const locale = projectData.locale || 'en';
    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      duration: this.calculateDuration(projectData.startDate, projectData.endDate),
      priority: projectData.priority,
      budget: projectData.budget || 'Not specified',
      tags: projectData.tags?.join(', ') || 'None'
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('risk-analysis', promptData, locale);
    } catch (error) {
      console.error('Error loading risk analysis prompt:', error);
      throw new AppError('Failed to load risk analysis prompt template', 500);
    }

    const result = await this.generate(prompt, true); // forceJson=true
    const response = result.response;
    const text = response.text();

    const parsed = this.safeParseJSON(text);
    if (parsed && parsed.risks && parsed.risks.length > 0) {
      return parsed.risks;
    }
    console.warn('[AI] JSON parse failed for risks, using text fallback');
    return this.parseRisks(text);
  }

  // Generate project timeline
  async generateTimeline(projectData, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }
    
    // Load prompt template based on project locale
    const locale = projectData.locale || 'en';
    const promptData = {
      projectName: projectData.name,
      projectDescription: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      duration: this.calculateDuration(projectData.startDate, projectData.endDate),
      priority: projectData.priority,
      budget: projectData.budget || 'Not specified'
    };

    let prompt;
    try {
      prompt = await promptLoaderService.getPrompt('timeline', promptData, locale);
    } catch (error) {
      console.error('Error loading timeline prompt:', error);
      throw new AppError('Failed to load timeline prompt template', 500);
    }

    const result = await this.generate(prompt);
    return result.response.text();
  }

  // Generate Gantt chart representation
  async generateGanttChart(projectData, tasks, selectedModel = null) {
    if (selectedModel) {
      this.setModel(selectedModel);
    }
    if (!tasks || tasks.length === 0) {
      console.warn('[AI] No tasks for Gantt chart — skipping Gantt generation');
      return null;
    }

    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Format tasks for the prompt
    const tasksInfo = tasks.map(task => {
      const assignee = typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo?.name || 'Unassigned');
      return `- ${task.name} (${assignee}) - ${task.estimatedHours || 0}h - Due: ${task.dueDate || 'Not set'}`;
    }).join('\n');

    // Load prompt template based on project locale
    const locale = projectData.locale || 'en';
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
      console.error('Error loading gantt chart prompt:', error);
      throw new AppError('Failed to load gantt chart prompt template', 500);
    }
    
    // Get JSON response from AI
    const result = await this.generate(prompt, true); // forceJson=true
    const responseText = result.response.text();
    
    // Parse JSON response
    let ganttData;
    try {
      // Clean up the response text (remove markdown code blocks if present)
      let cleanedText = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Try to extract JSON object if there's extra text around it
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      ganttData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gantt chart JSON:', parseError.message);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      
      // Return a fallback gantt structure built from the tasks we already have
      console.log('Building fallback Gantt chart from task data...');
      ganttData = this._buildFallbackGanttData(projectData, tasks);
    }

    // Generate image filename
    const timestamp = Date.now();
    const projectId = projectData.id
      || (projectData.name ? projectData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30) : null)
      || 'projekt';
    const filename = `gantt_${projectId}_${timestamp}.png`;
    const outputPath = path.join(__dirname, '..', 'public', 'gantt-charts', filename);

    // Try to generate the Gantt chart image
    try {
      console.log('Loading Gantt chart generator...');
      const generator = await loadGanttGenerator();
      console.log('Generating Gantt chart image:', outputPath);
      await generator.generateChart(ganttData, outputPath);
      console.log('Gantt chart image generated successfully:', filename);
      
      // Return both the JSON data and the image path
      return {
        success: true,
        imagePath: `/gantt-charts/${filename}`,
        data: ganttData
      };
    } catch (generateError) {
      console.error('[ERROR] Cannot generate Gantt chart image:', generateError);
      console.error('Stack trace:', generateError.stack);
      
      // Return JSON data only without image
      return {
        success: true,
        imagePath: null,
        data: ganttData,
        warning: `Gantt chart image generation failed: ${generateError.message}`
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
        if (dow !== 0 && dow !== 6) { // Skip Saturday (6) and Sunday (0)
          added++;
        }
      }
      return result;
    };

    const ganttTasks = tasks.map((task, idx) => {
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

      // Update assignee's next available date (day after task ends)
      assigneeNextAvailable[assignee] = addWorkDays(taskEnd, 0); // next work day after end
      // Actually set it to the day after taskEnd
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
        {
          name: 'Project Start',
          date: projectData.startDate,
          description: 'Project kickoff'
        },
        {
          name: 'Project End',
          date: projectData.endDate,
          description: 'Target completion'
        }
      ]
    };
  }

  // Map sub-roles to specific skills
  mapSubRolesToSkills(subRoles) {
    const skillMap = {
      'Frontend': ['React', 'Vue', 'HTML/CSS', 'JavaScript', 'UI/UX'],
      'Backend': ['Node.js', 'API Development', 'Database', 'Server Management'],
      'Fullstack': ['Frontend', 'Backend', 'Database', 'API Integration'],
      'DevOps': ['CI/CD', 'Docker', 'Cloud', 'Infrastructure', 'Monitoring'],
      'ProjectManager': ['Planning', 'Coordination', 'Risk Management', 'Communication']
    };

    const skills = new Set();
    subRoles.forEach(role => {
      if (skillMap[role]) {
        skillMap[role].forEach(skill => skills.add(skill));
      }
    });

    return Array.from(skills);
  }

  // Calculate project duration in days
  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Calculate available work hours
  calculateAvailableHours(startDate, endDate, teamSize) {
    const duration = this.calculateDuration(startDate, endDate);
    const workDaysPerWeek = 5;
    const hoursPerDay = 8;
    const weeks = duration / 7;
    const workDays = Math.floor(weeks * workDaysPerWeek);
    return workDays * hoursPerDay * teamSize;
  }

  // Extract team skills from member data
  extractTeamSkills(teamMembers) {
    const skills = new Set();
    
    teamMembers.forEach(member => {
      if (member.subRoles && Array.isArray(member.subRoles)) {
        member.subRoles.forEach(role => {
          switch(role) {
            case 'frontend_developer':
              skills.add('Frontend Development');
              skills.add('UI/UX Implementation');
              break;
            case 'backend_developer':
              skills.add('Backend Development');
              skills.add('API Development');
              skills.add('Database Design');
              break;
            case 'fullstack_developer':
              skills.add('Full-Stack Development');
              skills.add('End-to-End Implementation');
              break;
            case 'devops':
              skills.add('DevOps');
              skills.add('CI/CD');
              skills.add('Infrastructure Management');
              break;
          }
        });
      }
    });

    return Array.from(skills);
  }

  // Fallback task parsing
  // Robust JSON extractor: strips markdown fences, sanitizes control chars, tries partial repair
  safeParseJSON(text) {
    // Strip markdown code fences
    let clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

    // 1. Try direct parse first — valid JSON needs no modification
    try { return JSON.parse(clean); } catch {}

    // 2. Extract JSON object and try plain parse
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch {}

      // 3. Sanitize ONLY unescaped newlines inside string values
      const sanitized = objMatch[0].replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
        match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      );
      try { return JSON.parse(sanitized); } catch {}

      // 4. Last resort: truncation repair (close unclosed brackets)
      try {
        let attempt = sanitized;
        const opens = (attempt.match(/\[/g) || []).length;
        const closes = (attempt.match(/\]/g) || []).length;
        const objOpens = (attempt.match(/\{/g) || []).length;
        const objCloses = (attempt.match(/\}/g) || []).length;
        attempt += ']'.repeat(Math.max(0, opens - closes));
        attempt += '}'.repeat(Math.max(0, objOpens - objCloses));
        return JSON.parse(attempt);
      } catch {}
    }
    return null;
  }

  parseTasks(text) {
    const tasks = [];
    const lines = text.split('\n');
    
    let currentTask = null;
    for (const line of lines) {
      if (line.includes('Task:') || line.includes('Name:')) {
        if (currentTask) tasks.push(currentTask);
        currentTask = {
          name: line.replace(/.*(?:Task:|Name:)\s*/i, '').trim(),
          description: '',
          assignedRole: 'Developer',
          estimatedHours: 16,
          priority: 'Medium',
          phase: 'Development',
          dependencies: []
        };
      } else if (currentTask && line.includes('Description:')) {
        currentTask.description = line.replace(/.*Description:\s*/i, '').trim();
      }
    }
    
    if (currentTask) tasks.push(currentTask);
    return tasks;
  }

  // Fallback risk parsing
  parseRisks(text) {
    const risks = [];
    const riskPatterns = text.match(/Risk\s*\d*:?\s*([^\n]+)/gi) || [];
    
    riskPatterns.forEach(match => {
      risks.push({
        title: match.replace(/Risk\s*\d*:?\s*/i, '').trim(),
        description: 'AI-identified project risk requiring attention',
        severity: 'Medium',
        probability: 'Medium',
        impact: 'May impact project timeline or deliverables',
        mitigation: 'Develop mitigation strategy and monitor closely'
      });
    });

    return risks.length > 0 ? risks : [{
      title: 'General Project Risk',
      description: 'Standard project management risks apply',
      severity: 'Medium',
      probability: 'Medium',
      impact: 'Standard project challenges',
      mitigation: 'Regular monitoring and agile practices'
    }];
  }

  // Get priority-specific guidelines
  getPriorityGuidelines(priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'Fast delivery required, focus on experienced team members, shorter task durations';
      case 'medium':
        return 'Balanced approach, standard timelines, mixed team member experience';
      case 'low':
        return 'Flexible timelines, good for training junior members, longer task durations acceptable';
      default:
        return 'Standard project priority, balanced resource allocation';
    }
  }

  // Get priority-specific task guidance
  getPriorityTaskGuidance(priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'Assign critical tasks to senior team members, create shorter sprints, minimize dependencies';
      case 'medium':
        return 'Balance task complexity across team members, standard sprint lengths';
      case 'low':
        return 'Good opportunity for junior member development, longer task durations acceptable';
      default:
        return 'Use standard task allocation strategies';
    }
  }

  // Calculate task summary from generated tasks
  calculateTaskSummary(tasks, budget = 0) {
    if (!tasks || tasks.length === 0) {
      return {
        totalHours: 0,
        budgetUtilization: '0%',
        teamUtilization: {}
      };
    }

    // Calculate total hours
    const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    // Calculate budget utilization
    let budgetUtilization = '0%';
    if (budget > 0 && totalHours > 0) {
      // Assume average hourly rate of $50 if not specified
      const estimatedCost = totalHours * 50;
      const utilization = Math.min(100, Math.round((estimatedCost / budget) * 100));
      budgetUtilization = `${utilization}%`;
    }

    // Calculate team utilization
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
}

export default new GeminiProjectService();