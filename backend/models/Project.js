// Project model for PostgreSQL
// Schema for project management with team collaboration

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('planning', 'active', 'on-hold', 'completed', 'cancelled'),
    defaultValue: 'planning'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  teamsChannelId: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  teamsWebUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  plannerPlanId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  locale: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  aiSuggestions: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  aiStatus: {
    type: DataTypes.ENUM('generating', 'waiting_approval', 'approved', 'failed'),
    allowNull: true,
    defaultValue: null
  },
  aiOptions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  aiSuggestionId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'projects',
  timestamps: true
});

export default Project;
