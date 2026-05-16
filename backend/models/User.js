// User model for PostgreSQL
// Schema for user data with MS SSO integration

import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'pm', 'admin'),
    defaultValue: 'user'
  },
  subRoles: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  microsoftId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  msTeamsUserId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  azureAdToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profilePicture: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  position: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  location: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  locale: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      theme: 'light',
      language: 'en',
      sidebarCollapsed: false,
      compactMode: false,
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      projectUpdates: true,
      profileVisibility: 'team',
      showActivityStatus: true,
      dataAnalytics: true,
      sessionTimeout: 60
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Hash password before creating user
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Hash password before updating if it changed
User.beforeUpdate(async (user) => {
  if (user.changed('password') && user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
User.prototype.generateAuthToken = function() {
  return jwt.sign(
    { id: this.id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Remove sensitive data when converting to JSON
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.azureAdToken;
  delete values.refreshToken;
  return values;
};

export default User;
