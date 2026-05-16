import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['task_assigned', 'task_completed', 'project_invitation', 'deadline_approaching', 'team_member_joined', 'project_updated', 'ai_suggestion_ready', 'ai_suggestion_failed', 'test_notification']]
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  relatedId: {
    type: DataTypes.UUID,
    allowNull: true, // ID of related task, project, etc.
  },
  relatedType: {
    type: DataTypes.STRING,
    allowNull: true, // 'task', 'project', etc.
    validate: {
      isIn: [['task', 'project', 'user']]
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal',
    validate: {
      isIn: [['low', 'normal', 'high', 'urgent']]
    }
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'pi pi-info-circle'
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6'
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'isRead']
    },
    {
      fields: ['createdAt']
    }
  ]
});

export default Notification;