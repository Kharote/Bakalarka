// Model relationships configuration
// Define associations between models

import User from './User.js';
import Project from './Project.js';
import ProjectMember from './ProjectMember.js';
import Task from './Task.js';
import Notification from './Notification.js';
import SystemSettings from './SystemSettings.js';
import ChatMessage from './ChatMessage.js';
import Team from './Team.js';
import TeamMember from './TeamMember.js';

// User and Project relationships
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Project and ProjectMember relationships
Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });

// User and ProjectMember relationships
User.hasMany(ProjectMember, { foreignKey: 'userId' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Project and Task relationships
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User and Task relationships
User.hasMany(Task, { foreignKey: 'assignedToId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });

User.hasMany(Task, { foreignKey: 'createdById', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

// User and Notification relationships
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ChatMessage relationships
Project.hasMany(ChatMessage, { foreignKey: 'projectId', as: 'chatMessages' });
ChatMessage.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'chatUser' });

// Team relationships
User.hasMany(Team, { foreignKey: 'teamLeaderId', as: 'ledTeams' });
Team.belongsTo(User, { foreignKey: 'teamLeaderId', as: 'teamLeader' });

Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });

User.hasMany(TeamMember, { foreignKey: 'userId', as: 'teamMemberships' });
TeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, Project, ProjectMember, Task, Notification, SystemSettings, ChatMessage, Team, TeamMember };
