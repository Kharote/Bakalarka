// Migration to add AI status fields to projects table

import { DataTypes } from 'sequelize';

export const up = async (queryInterface) => {
  await queryInterface.addColumn('projects', 'aiStatus', {
    type: DataTypes.ENUM('generating', 'waiting_approval', 'failed'),
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('projects', 'aiOptions', {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('projects', 'aiSuggestionId', {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('projects', 'aiStatus');
  await queryInterface.removeColumn('projects', 'aiOptions');
  await queryInterface.removeColumn('projects', 'aiSuggestionId');
};