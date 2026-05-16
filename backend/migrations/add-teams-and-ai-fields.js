// Migration to add Teams integration and AI fields to projects table
// Run this with: node backend/migrations/add-teams-and-ai-fields.js

import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function addTeamsAndAIFields() {
  try {
    console.log('Adding Teams integration and AI fields to projects table...');

    // Add teamsId field
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "teamsId" VARCHAR(255);
    `, { type: QueryTypes.RAW });
    console.log('Added teamsId field');

    // Add teamsUrl field
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "teamsUrl" VARCHAR(500);
    `, { type: QueryTypes.RAW });
    console.log('Added teamsUrl field');

    // Add aiTimeline field
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "aiTimeline" TEXT;
    `, { type: QueryTypes.RAW });
    console.log('Added aiTimeline field');

    // Add risks field (JSON)
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "risks" TEXT;
    `, { type: QueryTypes.RAW });
    console.log('Added risks field');

    // Add approvedAt field
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP;
    `, { type: QueryTypes.RAW });
    console.log('Added approvedAt field');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addTeamsAndAIFields();
