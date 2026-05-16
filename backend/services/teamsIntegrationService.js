// Microsoft Teams integration service
// Handles creation of Teams workspaces and channels for projects

import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';
import debugLogger from './debugLogger.js';
import { getSetting } from './systemSettingsService.js';

class TeamsIntegrationService {
  constructor() {
    this.graphClient = null;
  }

  // Initialize Graph client with app-only authentication
  async initializeGraphClient() {
    try {
      // This would use app registration credentials for app-only access
      const authProvider = {
        getAccessToken: async () => {
          // Get app-only token from Azure AD
          const tokenResponse = await this.getAppOnlyToken();
          return tokenResponse.access_token;
        }
      };

      this.graphClient = Client.initWithMiddleware({ authProvider });
      return this.graphClient;
    } catch (error) {
      console.error('Error initializing Graph client:', error);
      throw new AppError('Failed to initialize Microsoft Graph client', 500);
    }
  }

  // Get app-only access token
  async getAppOnlyToken() {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.AZURE_AD_CLIENT_ID);
    params.append('client_secret', process.env.AZURE_AD_CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting app-only token:', error.response?.data || error.message);
      throw new AppError('Failed to get Microsoft Graph token', 500);
    }
  }

  // Poll until group is ready
  async waitForGroupProvisioning(groupId, maxWaitSeconds = 30) {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      try {
        // Try to fetch the group
        const group = await this.graphClient
          .api(`/groups/${groupId}`)
          .select('id,displayName,mail,resourceProvisioningOptions')
          .get();
        
        console.log(`Group ready after ${attempt} attempts (${Math.round((Date.now() - startTime) / 1000)}s)`);
        return group;
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`[WAITING] Attempt ${attempt}: Group not yet available, waiting...`);
          await this.delay(2000); // Wait 2s between attempts
        } else {
          throw error; // Different error, re-throw
        }
      }
    }
    
    throw new Error(`Group provisioning timeout after ${maxWaitSeconds}s`);
  }

  // Poll until team is ready
  async waitForTeamProvisioning(teamId, maxWaitSeconds = 30) {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      try {
        // Try to fetch the team
        const team = await this.graphClient
          .api(`/teams/${teamId}`)
          .get();
        
        console.log(`Team ready after ${attempt} attempts (${Math.round((Date.now() - startTime) / 1000)}s)`);
        return team;
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`[WAITING] Attempt ${attempt}: Team not yet available, waiting...`);
          await this.delay(2000); // Wait 2s between attempts
        } else {
          throw error; // Different error, re-throw
        }
      }
    }
    
    throw new Error(`Team provisioning timeout after ${maxWaitSeconds}s`);
  }

  // Create a Microsoft Team for the project
  async createProjectTeam(projectData, teamMembers) {
    // Check if Teams notifications are enabled in admin settings
    try {
      const teamsEnabledSetting = await getSetting('notifications.teamsEnabled');
      if (teamsEnabledSetting && teamsEnabledSetting.enabled === false) {
        console.log('Teams integration is disabled in system settings. Skipping team creation.');
        return {
          skipped: true,
          reason: 'Teams integration is disabled by administrator'
        };
      }
    } catch (err) {
      console.warn('Could not check Teams enabled setting, proceeding with creation:', err.message);
    }

    const debugData = {
      timestamp: new Date().toISOString(),
      step: 'createProjectTeam',
      input: {
        projectData,
        teamMembers
      },
      processing: {},
      output: {}
    };
    
    try {
      if (!this.graphClient) {
        await this.initializeGraphClient();
      }

      // Alternative approach: Create team directly from group using v1.0 endpoint
      console.log('Creating Team directly...');
      const groupMailNickname = `project-${Date.now()}`;
      
      // IMPORTANT: Microsoft Graph only allows ONE owner in initial team creation
      // Additional members must be added AFTER team is created
      const teamRequest = {
        'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
        displayName: projectData.name,
        description: projectData.description,
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${projectData.projectManagerId}`
          }
          // DO NOT add additional members here - Graph API limitation
        ],
        memberSettings: {
          allowCreateUpdateChannels: true,
          allowDeleteChannels: false,
          allowAddRemoveApps: true,
          allowCreateUpdateRemoveTabs: true,
          allowCreateUpdateRemoveConnectors: true
        },
        messagingSettings: {
          allowUserEditMessages: true,
          allowUserDeleteMessages: true,
          allowOwnerDeleteMessages: true,
          allowTeamMentions: true,
          allowChannelMentions: true
        },
        funSettings: {
          allowGiphy: false,
          allowStickersAndMemes: true,
          allowCustomMemes: true
        }
      };

      let createdTeam;
      let teamId;
      
      try {
        // Get token for raw request (Graph client doesn't expose headers properly)
        const tokenResponse = await this.getAppOnlyToken();
        
        // Use v1.0 /teams endpoint with raw fetch to access response headers
        console.log('Sending team creation request...');
        const rawResponse = await fetch('https://graph.microsoft.com/v1.0/teams', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(teamRequest)
        });
        
        console.log('Response status:', rawResponse.status, rawResponse.statusText);
        
        // v1.0 returns 202 Accepted with Content-Location header
        if (rawResponse.status === 202 || rawResponse.status === 201) {
          const contentLocation = rawResponse.headers.get('content-location');
          console.log('Content-Location header:', contentLocation);
          
          if (contentLocation) {
            // Extract team ID from URL like /teams('teamid')/operations('operationid')
            const match = contentLocation.match(/\/teams\('([^']+)'\)/);
            if (match) {
              teamId = match[1];
              console.log('Extracted team ID from header:', teamId);
            } else {
              console.error('Could not parse team ID from content-location:', contentLocation);
            }
          } else {
            console.error('No content-location header in response');
          }
        } else {
          // Handle error response
          const errorBody = await rawResponse.text();
          console.error('Unexpected response status:', rawResponse.status);
          console.error('Response body:', errorBody);
          throw new Error(`Team creation failed with status ${rawResponse.status}: ${errorBody}`);
        }
        
        console.log('Team creation initiated, ID:', teamId);
      } catch (error) {
        console.error('Team creation failed:', error);
        throw error;
      }
      
      if (!teamId) {
        throw new Error('Failed to get team ID from creation response');
      }
      
      // Wait for team provisioning
      console.log('Waiting for team to be fully provisioned...');
      await this.delay(5000);
      
      // Verify team is accessible
      await this.waitForTeamProvisioning(teamId, 30);
      
      // Install Planner app in Teams
      try {
        console.log('Installing Planner app in Teams...');
        await this.graphClient
          .api(`/teams/${teamId}/installedApps`)
          .post({
            'teamsApp@odata.bind': 'https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/com.microsoft.teamspace.tab.planner'
          });
        console.log('Planner app installed in Teams');
      } catch (plannerError) {
        console.log('Planner app may already be installed or installation failed:', plannerError.message);
        // Continue anyway - Planner might already be installed
      }
      
      // Add additional team members
      const additionalMembers = teamMembers.filter(id => id !== projectData.projectManagerId);
      
      if (additionalMembers.length > 0) {
        console.log(`Adding ${additionalMembers.length} additional team members...`);
        
        for (const memberId of additionalMembers) {
          try {
            await this.delay(500); // Rate limiting
            
            // First, verify the user exists by attempting to fetch their profile
            try {
              const userCheck = await this.graphClient
                .api(`/users/${memberId}`)
                .select('id,userPrincipalName,displayName')
                .get();
              console.log(`Verified user exists: ${userCheck.displayName} (${userCheck.userPrincipalName})`);
            } catch (userCheckError) {
              console.error(`User ${memberId} does not exist in directory:`, userCheckError.message);
              continue; // Skip this user
            }
            
            // Add as group member
            await this.graphClient
              .api(`/groups/${teamId}/members/$ref`)
              .post({
                '@odata.id': `https://graph.microsoft.com/v1.0/users/${memberId}`
              });
            
            console.log(`Added member: ${memberId}`);
          } catch (memberError) {
            console.error(`Failed to add member ${memberId}:`, memberError.message);
            // Continue with other members
          }
        }
      }
      
      return {
        teamId,
        displayName: projectData.name,
        description: projectData.description,
        webUrl: `https://teams.microsoft.com/l/team/${teamId}`
      };

    } catch (error) {
      console.error('Error creating Microsoft Team:', error);
      throw new AppError('Failed to create Microsoft Team: ' + error.message, 500);
    }
  }

  // Create project-specific channels
  async createProjectChannels(teamId) {
    const channels = [
      {
        displayName: 'Project Planning',
        description: 'Discuss project strategy, timeline, and planning',
        membershipType: 'standard'
      },
      {
        displayName: 'Development',
        description: 'Technical discussions and development updates',
        membershipType: 'standard'
      },
      {
        displayName: 'Design and UX',
        description: 'UI/UX design discussions and reviews',
        membershipType: 'standard'
      },
      {
        displayName: 'DevOps and Infrastructure',
        description: 'Deployment, infrastructure, and DevOps discussions',
        membershipType: 'standard'
      },
      {
        displayName: 'AI Assistant',
        description: 'AI-generated project insights and recommendations',
        membershipType: 'standard'
      }
    ];

    const createdChannels = [];

    for (const channelData of channels) {
      try {
        await this.delay(1000); // Rate limiting
        
        const channel = await this.graphClient
          .api(`/teams/${teamId}/channels`)
          .post(channelData);
        
        createdChannels.push(channel);
      } catch (error) {
        console.error(`Error creating channel ${channelData.displayName}:`, error);
      }
    }

    return createdChannels;
  }

  // Create Planner plan for the team
  async createPlannerPlan(teamId, planTitle) {
    try {
      console.log('Creating Planner plan...');
      
      const plan = {
        owner: teamId,
        title: planTitle
      };

      const createdPlan = await this.graphClient
        .api('/planner/plans')
        .post(plan);

      console.log(`Created Planner plan: ${createdPlan.id}`);
      return createdPlan;
    } catch (error) {
      console.error('Error creating Planner plan:', error);
      throw new AppError('Failed to create Planner plan: ' + error.message, 500);
    }
  }

  // Create tasks in Microsoft Planner and assign to users
  async createPlannerTasks(planId, tasks, teamMembers) {
    const debugData = {
      timestamp: new Date().toISOString(),
      step: 'createPlannerTasks',
      input: {
        planId,
        tasks: tasks.map(t => ({
          name: t.name,
          assignedTo: t.assignedTo,
          description: t.description?.substring(0, 100)
        })),
        teamMembers: teamMembers.map(m => ({
          id: m.id,
          displayName: m.displayName,
          mail: m.mail,
          userPrincipalName: m.userPrincipalName
        }))
      },
      assignments: [],
      createdTasks: []
    };
    
    try {
      console.log(`Creating ${tasks.length} tasks in Planner...`);
      console.log(`Team members available for assignment:`, teamMembers.map(m => `${m.displayName} (${m.mail})`).join(', '));
      
      const createdTasks = [];
      
      for (const task of tasks) {
        try {
          await this.delay(500); // Rate limiting
          
          // Find the team member by email first (priority), then name
          let assignee = null;
          
          if (task.assignedTo) {
            // Try email/userPrincipalName match first
            assignee = teamMembers.find(m => 
              m.mail?.toLowerCase() === task.assignedTo.toLowerCase() ||
              m.userPrincipalName?.toLowerCase() === task.assignedTo.toLowerCase()
            );
            
            // If no match, try display name
            if (!assignee) {
              assignee = teamMembers.find(m => 
                m.displayName?.toLowerCase() === task.assignedTo.toLowerCase()
              );
            }
          }
          
          const assignmentInfo = {
            taskName: task.name,
            assignedToInput: task.assignedTo,
            matchedMember: assignee ? {
              id: assignee.id,
              displayName: assignee.displayName,
              mail: assignee.mail
            } : null,
            matchType: assignee ? 
              (assignee.mail?.toLowerCase() === task.assignedTo?.toLowerCase() ? 'email' : 
               assignee.userPrincipalName?.toLowerCase() === task.assignedTo?.toLowerCase() ? 'userPrincipalName' : 'displayName') 
              : 'no-match'
          };
          
          debugData.assignments.push(assignmentInfo);
          console.log(`Task "${task.name}" assignment: ${task.assignedTo} -> ${assignee ? `${assignee.displayName} (${assignee.mail})` : 'UNASSIGNED'}`);

          // Prepare assignments object
          const assignments = {};
          if (assignee) {
            assignments[assignee.id] = {
              '@odata.type': '#microsoft.graph.plannerAssignment',
              orderHint: ' !'
            };
          }

          // Create Planner task
          const plannerTask = {
            planId: planId,
            title: task.name,
            assignments: assignments,
            dueDateTime: task.dueDate ? new Date(task.dueDate).toISOString() : null,
            percentComplete: 0,
            priority: this.getPlannerPriority(task.priority)
          };

          // Add details if description exists
          const createdTask = await this.graphClient
            .api('/planner/tasks')
            .post(plannerTask);

          // Add description to task details
          if (task.description) {
            try {
              await this.delay(300);
              // First, get the task details to obtain the eTag
              const taskDetails = await this.graphClient
                .api(`/planner/tasks/${createdTask.id}/details`)
                .get();
              
              // Now update with the If-Match header
              await this.graphClient
                .api(`/planner/tasks/${createdTask.id}/details`)
                .header('If-Match', taskDetails['@odata.etag'])
                .patch({
                  description: task.description,
                  previewType: 'description'
                });
            } catch (detailError) {
              console.warn(`Could not add description to task ${task.name}:`, detailError.message);
            }
          }

          createdTasks.push(createdTask);
          console.log(`Created Planner task: ${task.name}${assignee ? ` (assigned to ${assignee.displayName})` : ''}`);
          
        } catch (taskError) {
          console.error(`Failed to create task "${task.name}":`, taskError.message);
        }
      }

      console.log(`Created ${createdTasks.length}/${tasks.length} Planner tasks`);
      
      debugData.createdTasks = createdTasks.map(t => ({
        id: t.id,
        title: t.title,
        hasAssignments: Object.keys(t.assignments || {}).length > 0,
        assignmentCount: Object.keys(t.assignments || {}).length
      }));
      
      // Write debug log
      await debugLogger.log('planner-tasks-creation', debugData);
      
      return createdTasks;
      
    } catch (error) {
      console.error('Error creating Planner tasks:', error);
      debugData.error = {
        message: error.message,
        stack: error.stack
      };
      await debugLogger.log('planner-tasks-creation-ERROR', debugData);
      throw new AppError('Failed to create Planner tasks: ' + error.message, 500);
    }
  }

  // Get team members for assignment
  async getTeamMembers(teamId) {
    try {
      const members = await this.graphClient
        .api(`/groups/${teamId}/members`)
        .select('id,displayName,mail,userPrincipalName')
        .get();

      return members.value || [];
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  // Convert priority to Planner format (0-10, where 0 is urgent)
  getPlannerPriority(priority) {
    const priorityMap = {
      'High': 1,
      'Medium': 5,
      'Low': 9
    };
    return priorityMap[priority] || 5;
  }

  // Send AI-generated content to Teams channel using migration API
  async sendAIContentToChannel(teamId, channelId, aiContent) {
    // Check if Teams notifications are enabled
    try {
      const teamsEnabledSetting = await getSetting('notifications.teamsEnabled');
      if (teamsEnabledSetting && teamsEnabledSetting.enabled === false) {
        console.log('Teams integration is disabled in system settings. Skipping message send.');
        return { skipped: true, reason: 'Teams integration is disabled by administrator' };
      }
    } catch (err) {
      console.warn('Could not check Teams enabled setting, proceeding:', err.message);
    }

    try {
      // Step 1: Put team in migration mode
      await this.graphClient
        .api(`/teams/${teamId}`)
        .patch({
          '@microsoft.graph.teamCreationMode': 'migration'
        });
      
      console.log('Team in migration mode');
      
      // Step 2: Send message with historical timestamp
      const message = {
        body: {
          contentType: 'html',
          content: this.formatAIContentForTeams(aiContent)
        },
        importance: 'high',
        createdDateTime: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        from: {
          user: {
            displayName: 'AI Assistant',
            userIdentityType: 'aadUser'
          }
        }
      };

      const sentMessage = await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(message);

      console.log('AI content sent to channel');
      
      // Step 3: Complete migration
      await this.graphClient
        .api(`/teams/${teamId}/completeMigration`)
        .post({});
      
      console.log('Migration completed');

      return sentMessage;
    } catch (error) {
      console.error('Error sending AI content to Teams:', error);
      throw new AppError('Failed to send content to Teams channel', 500);
    }
  }

  // Format team members for Teams API
  async formatTeamMembers(teamMemberIds, projectManagerId) {
    const members = [];

    // Add project manager as owner
    if (projectManagerId) {
      members.push({
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${projectManagerId}')`
      });
    }

    // Add team members
    for (const memberId of teamMemberIds) {
      if (memberId !== projectManagerId) {
        members.push({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['member'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${memberId}')`
        });
      }
    }

    return members;
  }

  // Format AI content for Teams display
  formatAIContentForTeams(aiContent) {
    let html = `<div style="padding: 20px; border-left: 4px solid #4f46e5; background-color: #f8fafc; border-radius: 8px; margin: 10px 0;">`;
    html += `<h2 style="color: #4f46e5; margin-top: 0; font-size: 18px;">AI Project Analysis & Recommendations</h2>`;
    
    if (aiContent.tasks && aiContent.tasks.length > 0) {
      html += `<h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Recommended Tasks</h3>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      aiContent.tasks.forEach(task => {
        const roleEmoji = this.getRoleEmoji(task.assignedRole);
        html += `<li style="margin: 8px 0; line-height: 1.4;">`;
        html += `<strong>${task.name}</strong><br/>`;
        html += `<span style="color: #6b7280;">${task.description}</span><br/>`;
        html += `<span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${roleEmoji} ${task.assignedRole}</span>`;
        html += `</li>`;
      });
      html += `</ul>`;
    }

    if (aiContent.risks && aiContent.risks.length > 0) {
      html += `<h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Identified Risks</h3>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      aiContent.risks.forEach(risk => {
        const severityColor = this.getSeverityColor(risk.severity);
        html += `<li style="margin: 8px 0; line-height: 1.4;">`;
        html += `<strong>${risk.title}</strong><br/>`;
        html += `<span style="color: #6b7280;">${risk.description}</span><br/>`;
        html += `<span style="background: ${severityColor.bg}; color: ${severityColor.text}; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${risk.severity}</span>`;
        html += `</li>`;
      });
      html += `</ul>`;
    }

    if (aiContent.timeline) {
      html += `<h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Project Timeline</h3>`;
      html += `<div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">`;
      html += `<p style="margin: 0; color: #374151; line-height: 1.5;">${aiContent.timeline}</p>`;
      html += `</div>`;
    }

    if (aiContent.ganttChart) {
      html += `<h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Gantt Chart Overview</h3>`;
      html += `<div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">`;
      html += `<pre style="margin: 0; color: #374151; font-size: 12px; overflow-x: auto;">${aiContent.ganttChart}</pre>`;
      html += `</div>`;
    }

    html += `<hr style="margin: 20px 0; border: none; height: 1px; background: #e5e7eb;">`;
    html += `<p style="margin: 0; color: #9ca3af; font-size: 12px; font-style: italic;">Generated by AI Assistant • ${new Date().toLocaleString()}</p>`;
    html += `</div>`;
    
    return html;
  }

  getRoleEmoji(role) {
    const roleEmojis = {
      'Frontend Developer': '[FE]',
      'Backend Developer': '[BE]',
      'Fullstack Developer': '[FS]',
      'DevOps': '[DevOps]',
      'Project Manager': '[PM]',
      'Designer': '[Design]',
      'QA': '[QA]'
    };
    return roleEmojis[role] || '[Dev]';
  }

  getSeverityColor(severity) {
    const colors = {
      'High': { bg: '#fef2f2', text: '#dc2626' },
      'Medium': { bg: '#fef3c7', text: '#d97706' },
      'Low': { bg: '#f0fdf4', text: '#16a34a' }
    };
    return colors[severity] || colors['Medium'];
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch tasks from a Planner plan and return their status
  async getPlannerTaskStatuses(planId) {
    try {
      if (!this.graphClient) {
        await this.initializeGraphClient();
      }

      const response = await this.graphClient
        .api(`/planner/plans/${planId}/tasks`)
        .select('id,title,percentComplete,assignments,dueDateTime,priority,createdDateTime')
        .get();

      return (response.value || []).map(task => ({
        plannerTaskId: task.id,
        title: task.title,
        percentComplete: task.percentComplete,
        // Map Planner percentComplete to our status enum
        status: this.mapPlannerPercentToStatus(task.percentComplete),
        priority: this.mapPlannerPriorityToLocal(task.priority),
        dueDate: task.dueDateTime,
        assignedUserIds: Object.keys(task.assignments || {}),
        createdDateTime: task.createdDateTime
      }));
    } catch (error) {
      console.error('Error fetching Planner tasks:', error.message);
      throw new AppError('Failed to fetch tasks from Microsoft Planner', 500);
    }
  }

  // Map Planner percentComplete (0, 50, 100) to local status
  mapPlannerPercentToStatus(percentComplete) {
    if (percentComplete === 100) return 'completed';
    if (percentComplete === 50) return 'in-progress';
    return 'todo';
  }

  // Map Planner priority number back to our string
  mapPlannerPriorityToLocal(plannerPriority) {
    // Planner: 0-1 = Urgent, 2-3 = Important, 4-6 = Medium, 7-9 = Low
    if (plannerPriority <= 1) return 'critical';
    if (plannerPriority <= 3) return 'high';
    if (plannerPriority <= 6) return 'medium';
    return 'low';
  }

  // Update a Planner task's percentComplete (0, 50, 100)
  async updatePlannerTaskPercent(plannerTaskId, percentComplete) {
    try {
      if (!this.graphClient) {
        await this.initializeGraphClient();
      }

      // Get the task to obtain the etag for optimistic concurrency
      const task = await this.graphClient
        .api(`/planner/tasks/${plannerTaskId}`)
        .get();

      await this.graphClient
        .api(`/planner/tasks/${plannerTaskId}`)
        .header('If-Match', task['@odata.etag'])
        .patch({ percentComplete });

      console.log(`[Planner] Updated task ${plannerTaskId} percentComplete to ${percentComplete}`);
      return true;
    } catch (error) {
      console.error(`[Planner] Failed to update task ${plannerTaskId}:`, error.message);
      return false;
    }
  }
}

export default new TeamsIntegrationService();