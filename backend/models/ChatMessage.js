import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['user', 'assistant']]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  indexes: [
    {
      fields: ['projectId', 'userId', 'createdAt']
    },
    {
      fields: ['userId']
    }
  ]
});

export default ChatMessage;
