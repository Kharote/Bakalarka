// Migration: Add 'approved' to aiStatus enum
// Purpose: Allow setting project status to 'approved' after applying AI suggestions

import { sequelize } from '../config/database.js';

const addApprovedToAiStatus = async () => {
  try {
    console.log('Adding "approved" value to aiStatus enum...');
    
    // PostgreSQL requires special handling for enum updates
    // We need to use raw SQL to add a new value to an existing enum
    await sequelize.query(`
      ALTER TYPE "enum_projects_aiStatus" ADD VALUE IF NOT EXISTS 'approved';
    `);
    
    console.log('Migration completed successfully');
    console.log('[INFO] aiStatus enum now includes: generating, waiting_approval, approved, failed');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

addApprovedToAiStatus();
