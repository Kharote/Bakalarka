// Migration: Add msTeamsUserId to users table
// Purpose: Store MS Teams user ID for Teams integration

import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';

const addMsTeamsUserIdColumn = async () => {
  try {
    console.log('Adding msTeamsUserId column to users table...');
    
    // This will sync the model with the database and add the new column
    await sequelize.sync({ alter: true });
    
    console.log('Migration completed successfully');
    console.log('[INFO] msTeamsUserId column has been added to users table');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

addMsTeamsUserIdColumn();
