// Apply AI suggestions controller
import { Project, ProjectMember, Task, User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import path from 'path';
import fs from 'fs-extra';
import { sendNotificationToUser } from '../services/websocketService.js';
import debugLogger from '../services/debugLogger.js';

// Helper function to create notifications
const createNotification = async (userId, notificationData) => {
  try {
    const { Notification } = await import('../models/index.js');
    
    const notification = await Notification.create({
      userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'normal',
      icon: notificationData.icon || 'pi pi-info-circle',
      color: notificationData.color || '#3b82f6',
      data: notificationData.data || {},
      isRead: false
    });

    console.log('Notification created:', notification.id);
    
    // Send real-time notification via WebSocket
    const notificationPayload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      priority: notification.priority,
      icon: notification.icon,
      color: notification.color,
      data: notification.data,
      createdAt: notification.createdAt
    };
    
    sendNotificationToUser(userId, notificationPayload);
    console.log('WebSocket notification sent to user:', userId);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Apply AI suggestions to project - Accept and create tasks, integrate with MS Teams
export const applyAISuggestions = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { tasks, risks, timeline, suggestionId } = req.body;
    
    console.log(`Applying AI suggestions to project ${projectId}...`);

    // Verify project exists and user has access
    const project = await Project.findByPk(projectId, {
      include: [
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'msTeamsUserId', 'subRoles'] }]
        }
      ]
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const results = {
      tasksCreated: 0,
      risksStored: 0,
      teamsIntegration: null,
      errors: []
    };

    // Get suggestion data for Gantt chart
    let ganttChartPath = null;
    if (suggestionId) {
      try {
        const suggestionPath = path.join(process.cwd(), 'ai-suggestions', `${suggestionId}.json`);
        if (await fs.pathExists(suggestionPath)) {
          const suggestionData = await fs.readJSON(suggestionPath);
          ganttChartPath = suggestionData.analysis?.ganttChart?.imagePath;
        }
      } catch (err) {
        console.error('Error loading suggestion data:', err);
      }
    }

    // Get all team members with their roles (used for task assignment and Teams integration)
    const teamMembers = project.members.map(m => m.user);
    
    // Get project owner details
    const projectOwner = await User.findByPk(project.ownerId, {
      attributes: ['id', 'name', 'email', 'msTeamsUserId']
    });
    
    // Debug log: Initial project and team member data
    const debugData = {
      timestamp: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
      projectOwner: {
        id: project.ownerId,
        name: projectOwner?.name,
        email: projectOwner?.email,
        msTeamsUserId: projectOwner?.msTeamsUserId
      },
      teamMembers: teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        msTeamsUserId: m.msTeamsUserId,
        subRoles: m.subRoles
      })),
      tasksFromAI: tasks?.map(t => ({
        name: t.name,
        assignedTo: t.assignedTo,
        assignedRole: t.assignedRole,
        priority: t.priority
      })) || [],
      databaseTaskAssignments: [],
      teamsIntegration: {},
      plannerAssignments: []
    };

    // Create tasks from AI suggestions
    if (tasks && tasks.length > 0) {
      console.log(`Creating ${tasks.length} tasks...`);
      
      for (const taskData of tasks) {
        try {
          // Find best matching assignee based on email first, then role
          let assigneeId = project.ownerId;
          let matchedBy = 'default (project owner)';
          
          // First try to match by email address from assignedTo field
          if (taskData.assignedTo) {
            // Check if assignedTo looks like an email (contains @)
            if (taskData.assignedTo.includes('@')) {
              const matchingMember = teamMembers.find(member => 
                member.email.toLowerCase() === taskData.assignedTo.toLowerCase()
              );
              
              if (matchingMember) {
                assigneeId = matchingMember.id;
                matchedBy = `email: ${matchingMember.email}`;
              } else {
                console.log(`[WARN] No team member found with email: ${taskData.assignedTo}`);
              }
            }
          }
          
          // If no email match and role is provided, try role matching
          if (assigneeId === project.ownerId && taskData.assignedRole) {
            // Normalize the role string (handle both "frontend_developer" and "Frontend Developer")
            const normalizedRole = taskData.assignedRole.toLowerCase().replace(/[_\s]+/g, '');
            
            const roleMap = {
              'frontenddeveloper': 'frontend',
              'frontend': 'frontend',
              'backenddeveloper': 'backend',
              'backend': 'backend',
              'fullstackdeveloper': 'fullstack',
              'fullstack': 'fullstack',
              'devopsengineer': 'devops',
              'devops': 'devops',
              'projectmanager': 'projectmanager',
              'pm': 'projectmanager',
              'designer': 'frontend',
              'qaengineer': 'backend',
              'qa': 'backend',
              'tester': 'backend'
            };
            
            const targetRole = roleMap[normalizedRole] || 'fullstack';
            const matchingMember = teamMembers.find(member => 
              member.subRoles?.includes(targetRole)
            );
            
            if (matchingMember) {
              assigneeId = matchingMember.id;
              matchedBy = `role: ${targetRole} (${matchingMember.email})`;
            }
          }

          console.log(`Assigning task "${taskData.name}" to user ${assigneeId} (matched by ${matchedBy})`);
          
          // Log assignment for debug
          debugData.databaseTaskAssignments.push({
            taskName: taskData.name,
            assignedToInput: taskData.assignedTo,
            assignedRoleInput: taskData.assignedRole,
            finalAssigneeId: assigneeId,
            finalAssigneeName: teamMembers.find(m => m.id === assigneeId)?.name,
            finalAssigneeEmail: teamMembers.find(m => m.id === assigneeId)?.email,
            matchedBy
          });

          const task = await Task.create({
            projectId: project.id,
            title: taskData.name,
            description: taskData.description,
            assignedToId: assigneeId,
            createdById: project.ownerId,
            priority: taskData.priority?.toLowerCase() || 'medium',
            status: 'todo',
            estimatedHours: taskData.estimatedHours || 8,
            dueDate: taskData.dueDate || null,
            phase: taskData.phase || 'Development'
          });

          results.tasksCreated++;
          console.log(`Created task: ${task.title}`);

          // Create notification for assignee
          await createNotification(assigneeId, {
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned: ${task.title}`,
            priority: task.priority === 'high' ? 'high' : 'normal',
            icon: 'pi pi-check-square',
            color: '#10b981',
            data: {
              taskId: task.id,
              projectId: project.id,
              projectName: project.name
            }
          });

        } catch (taskError) {
          console.error(`Error creating task ${taskData.name}:`, taskError);
          results.errors.push(`Failed to create task: ${taskData.name}`);
        }
      }
    }

    // Store risks in project metadata
    if (risks && risks.length > 0) {
      await project.update({
        risks: JSON.stringify(risks)
      });
      results.risksStored = risks.length;
      console.log(`Stored ${risks.length} risks`);
    }

    // Store timeline
    if (timeline) {
      await project.update({
        aiTimeline: timeline
      });
      console.log(`Stored timeline`);
    }

    // Update project AI status to approved
    await project.update({
      aiStatus: 'approved',
      approvedAt: new Date()
    });

    // Create Microsoft Teams space and send content (OPTIONAL — skipped if no MS Teams account)
    try {
      // Check if Teams workspace already exists
      if (project.teamsChannelId) {
        console.log('[WARN] Teams workspace already exists for this project, skipping creation');
        console.log('   Existing Team ID:', project.teamsChannelId);
        results.teamsIntegration = { skipped: true, reason: 'Teams workspace already exists' };
        throw Object.assign(new Error('TEAMS_SKIP'), { isTeamsSkip: true });
      }
      
      console.log('Creating Microsoft Teams integration...');
      
      const teamsIntegration = await import('../services/teamsIntegrationService.js');
      
      // Get project owner's MS Teams ID
      const projectOwner = await User.findByPk(project.ownerId);
      if (!projectOwner || !projectOwner.msTeamsUserId) {
        console.log('[INFO] Project owner has no MS Teams account linked — skipping Teams integration');
        results.teamsIntegration = { skipped: true, reason: 'No MS Teams account linked' };
        throw Object.assign(new Error('TEAMS_SKIP'), { isTeamsSkip: true });
      }
      
      // Get team member MS Teams user IDs (Azure AD IDs) - EXCLUDE the owner, they're added as owner in createProjectTeam
      const teamMemberAzureIds = teamMembers
        .filter(m => m.msTeamsUserId && m.id !== project.ownerId) // Filter out owner to avoid duplicate
        .map(m => m.msTeamsUserId);

      debugData.teamsIntegration.projectManagerAzureId = projectOwner.msTeamsUserId;
      debugData.teamsIntegration.teamMemberAzureIds = teamMemberAzureIds;
      debugData.teamsIntegration.totalMembersToAdd = teamMemberAzureIds.length;
      
      // Log what we're sending to Teams
      console.log(`Creating Teams with PM: ${projectOwner.email} (${projectOwner.msTeamsUserId})`);
      console.log(`Adding ${teamMemberAzureIds.length} team members:`, 
        teamMembers
          .filter(m => m.msTeamsUserId && m.id !== project.ownerId)
          .map(m => `${m.email} (${m.msTeamsUserId})`)
      );

      if (teamMemberAzureIds.length === 0) {
        console.warn('[WARN] No additional team members have MS Teams accounts linked (only PM will be added).');
      }

      // Create Teams workspace
      const teamsWorkspace = await teamsIntegration.default.createProjectTeam(
        {
          name: project.name,
          description: project.description,
          projectManagerId: projectOwner.msTeamsUserId // Use Azure AD ID, not database ID
        },
        teamMemberAzureIds // Pass array of Azure AD IDs for team members (excluding owner)
      );

      debugData.teamsIntegration.teamCreated = {
        teamId: teamsWorkspace.teamId,
        webUrl: teamsWorkspace.webUrl
      };

      results.teamsIntegration = {
        teamId: teamsWorkspace.teamId,
        webUrl: teamsWorkspace.webUrl
      };

      // Create channels
      const channels = await teamsIntegration.default.createProjectChannels(teamsWorkspace.teamId);
      console.log(`Created ${channels.length} Teams channels`);

      // Create Planner plan and tasks (MANDATORY)
      console.log('Creating Planner plan and tasks...');
      const plannerPlan = await teamsIntegration.default.createPlannerPlan(
        teamsWorkspace.teamId,
        `${project.name} - Tasks`
      );

      results.teamsIntegration.planId = plannerPlan.id;

      // Get team members for task assignment
      const teamMembersForPlanner = await teamsIntegration.default.getTeamMembers(teamsWorkspace.teamId);
      
      debugData.teamsIntegration.teamMembersFromGraph = teamMembersForPlanner.map(m => ({
        id: m.id,
        displayName: m.displayName,
        mail: m.mail,
        userPrincipalName: m.userPrincipalName
      }));
      
      console.log(`Retrieved ${teamMembersForPlanner.length} members from Teams:`, 
        teamMembersForPlanner.map(m => `${m.displayName} (${m.mail})`).join(', ')
      );

      // Create tasks in Planner with EMAIL-based assignment
      if (tasks && tasks.length > 0) {
        // Map AI tasks to use email addresses for assignment matching
        const tasksForPlanner = tasks.map(task => {
          let emailForAssignment = null;
          
          if (task.assignedTo) {
            // Extract email from format like "Martin Kanik (kanikmartin_gmail.com#EXT#@kanikmartingmail.onmicrosoft.com)"
            const match = task.assignedTo.match(/\(([^)]+)\)/);
            if (match) {
              // Got something in parentheses - could be UPN
              const upnOrEmail = match[1];
              
              // Convert external UPN format to regular email
              // kanikmartin_gmail.com#EXT#@kanikmartingmail.onmicrosoft.com -> kanikmartin@gmail.com
              if (upnOrEmail.includes('#EXT#')) {
                const emailPart = upnOrEmail.split('#EXT#')[0];
                emailForAssignment = emailPart.replace(/_/g, '@');
              } else {
                emailForAssignment = upnOrEmail;
              }
            } else if (task.assignedTo.includes('@')) {
              // Already an email
              emailForAssignment = task.assignedTo;
            }
          }
          
          // If still no email, try to find by role
          if (!emailForAssignment && task.assignedRole) {
            const normalizedRole = task.assignedRole.toLowerCase().replace(/[_\s]+/g, '');
            const roleMap = {
              'frontenddeveloper': 'frontend',
              'frontend': 'frontend',
              'backenddeveloper': 'backend',
              'backend': 'backend',
              'fullstackdeveloper': 'fullstack',
              'fullstack': 'fullstack',
              'devopsengineer': 'devops',
              'devops': 'devops'
            };
            const targetRole = roleMap[normalizedRole];
            const matchingMember = teamMembers.find(m => m.subRoles?.includes(targetRole));
            if (matchingMember) {
              emailForAssignment = matchingMember.email;
            }
          }
          
          // Default to PM email if nothing else worked
          if (!emailForAssignment) {
            emailForAssignment = projectOwner.email;
          }
          
          return {
            ...task,
            assignedTo: emailForAssignment
          };
        });
        
        debugData.teamsIntegration.tasksForPlanner = tasksForPlanner.map(t => ({
          name: t.name,
          originalAssignedTo: tasks.find(orig => orig.name === t.name)?.assignedTo,
          extractedEmail: t.assignedTo
        }));
        
        console.log('Task email extraction:');
        tasksForPlanner.forEach((t, i) => {
          console.log(`  ${t.name}: ${tasks[i].assignedTo} -> ${t.assignedTo}`);
        });
        
        const plannerTasks = await teamsIntegration.default.createPlannerTasks(
          plannerPlan.id,
          tasksForPlanner,
          teamMembersForPlanner
        );
        results.plannerTasksCreated = plannerTasks.length;
        
        debugData.plannerAssignments = plannerTasks.map(t => ({
          taskId: t.id,
          title: t.title,
          assignments: t.assignments
        }));

        // Link Planner task IDs back to local DB tasks by matching title
        for (const plannerTask of plannerTasks) {
          try {
            const localTask = await Task.findOne({
              where: { projectId: project.id, title: plannerTask.title }
            });
            if (localTask) {
              await localTask.update({ teamsTaskId: plannerTask.id });
            }
          } catch (linkErr) {
            console.error(`Failed to link Planner task "${plannerTask.title}":`, linkErr.message);
          }
        }
        
        console.log(`Created ${plannerTasks.length} tasks in Microsoft Planner`);
      }

      // Send AI content to AI Assistant channel (optional - requires Teamwork.Migrate.All permission)
      const aiChannel = channels.find(c => c.displayName === 'AI Assistant');
      if (aiChannel) {
        try {
          const aiContent = {
            tasks: tasks || [],
            risks: risks || [],
            timeline: timeline,
            ganttChart: ganttChartPath ? `Gantt Chart: ${process.env.BACKEND_URL || 'http://localhost:3000'}${ganttChartPath}` : null
          };

          await teamsIntegration.default.sendAIContentToChannel(
            teamsWorkspace.teamId,
            aiChannel.id,
            aiContent
          );
          console.log(`Sent AI content to Teams channel`);
        } catch (messageError) {
          console.warn(`[WARN] Could not send AI content to channel (requires Teamwork.Migrate.All permission):`, messageError.message);
          // Continue anyway - team and channels are created
        }
      }

      // Update project with Teams info
      await project.update({
        teamsId: teamsWorkspace.teamId,
        teamsUrl: teamsWorkspace.webUrl,
        plannerPlanId: plannerPlan.id
      });
      
      // Write comprehensive debug log
      await debugLogger.log('teams-planner-integration', debugData);

    } catch (teamsError) {
      if (!teamsError.isTeamsSkip) {
        console.error('Teams integration error:', teamsError);
        debugData.error = { message: teamsError.message, stack: teamsError.stack };
        await debugLogger.log('teams-planner-integration-ERROR', debugData);
        console.log('[WARN] Teams integration skipped due to error:', teamsError.message);
        results.teamsIntegration = { skipped: true, reason: teamsError.message };
      }
    }

    // Create notification for project owner
    await createNotification(project.ownerId, {
      type: 'project_updated',
      title: 'AI Suggestions Applied',
      message: `${results.tasksCreated} tasks created for project "${project.name}"`,
      priority: 'high',
      icon: 'pi pi-check-circle',
      color: '#10b981',
      data: {
        projectId: project.id,
        projectName: project.name,
        tasksCreated: results.tasksCreated
      }
    });

    console.log(`Applied AI suggestions successfully`);

    res.json({
      success: true,
      message: 'AI suggestions applied successfully',
      data: {
        projectId: project.id,
        ...results
      }
    });

  } catch (error) {
    console.error('Error applying AI suggestions:', error);
    next(error);
  }
};
