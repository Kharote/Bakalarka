// SystemSettings Model
// Stores system-wide configuration that only admins can manage
// Uses a key-value pattern with JSONB for flexible settings storage

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  category: {
    type: DataTypes.ENUM('ai', 'system', 'prompts', 'notifications', 'security'),
    allowNull: false,
    defaultValue: 'system'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  indexes: [
    { fields: ['key'], unique: true },
    { fields: ['category'] }
  ]
});

export default SystemSettings;
