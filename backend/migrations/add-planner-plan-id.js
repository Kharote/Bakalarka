// Migration to add plannerPlanId field to projects table
// Run this with: node backend/migrations/add-planner-plan-id.js

import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function addPlannerPlanId() {
  try {
    console.log('Adding plannerPlanId field to projects table...');

    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "plannerPlanId" VARCHAR(255);
    `, { type: QueryTypes.RAW });
    console.log('Added plannerPlanId field');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addPlannerPlanId();
