// Task model for PostgreSQL
// Schema for task management with MS Teams integration

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('todo', 'in-progress', 'review', 'completed', 'blocked'),
    defaultValue: 'todo'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedHours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  actualHours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  teamsTaskId: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  teamsMessageId: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  comments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  aiGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  aiSuggestions: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'tasks',
  timestamps: true
});

export default Task;
