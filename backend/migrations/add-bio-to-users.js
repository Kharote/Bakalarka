import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function addBioToUsers() {
  try {
    console.log('Starting migration: add bio field to users table...');

    // Check if column already exists
    const [columns] = await sequelize.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'bio'`,
      { type: QueryTypes.SELECT }
    );

    if (columns) {
      console.log('Column "bio" already exists in users table');
      return;
    }

    // Add the bio column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN bio TEXT NULL
    `);

    console.log('Successfully added "bio" column to users table');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addBioToUsers()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default addBioToUsers;
