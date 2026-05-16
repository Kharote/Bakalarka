// Migration to add locale field to projects table
// This allows projects to have different AI prompt languages

import { sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';

async function addLocaleToProjects() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('Starting migration: Adding locale to projects table...');

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('projects');
    
    if (!tableDescription.locale) {
      console.log('Adding locale column to projects table...');
      
      await queryInterface.addColumn('projects', 'locale', {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'en',
        after: 'tags'
      });
      
      console.log('Successfully added locale column to projects table');
    } else {
      console.log('[WARN] locale column already exists in projects table');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
addLocaleToProjects()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
