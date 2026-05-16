import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function addDataToNotifications() {
  try {
    console.log('Starting migration: add data field to notifications table...');

    // Check if column already exists
    const [columns] = await sequelize.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'notifications' 
       AND COLUMN_NAME = 'data'`,
      { type: QueryTypes.SELECT }
    );

    if (columns) {
      console.log('Column "data" already exists in notifications table');
      return;
    }

    // Add the data column
    await sequelize.query(`
      ALTER TABLE notifications 
      ADD COLUMN data JSON NULL
    `);

    console.log('Successfully added "data" column to notifications table');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addDataToNotifications()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default addDataToNotifications;
