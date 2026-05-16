// Convert subRole to subRoles array
// Run this script to migrate existing users to new subRoles array format

import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';

const migrateSubRolesToArray = async () => {
  try {
    console.log('Starting subRole to subRoles migration...');
    
    // First sync the model to add subRoles column
    await sequelize.sync({ alter: true });
    console.log('Database schema updated');
    
    // Get all users with existing subRole data
    const users = await User.findAll();
    console.log(`Found ${users.length} users to migrate`);
    
    let migratedCount = 0;
    
    for (const user of users) {
      try {
        // Convert single subRole to array format
        let newSubRoles = [];
        
        if (user.subRole && user.subRole !== 'none') {
          newSubRoles = [user.subRole];
        }
        
        // Update the user with new subRoles array
        await User.update(
          { subRoles: newSubRoles },
          { where: { id: user.id } }
        );
        
        migratedCount++;
        console.log(`Migrated user: ${user.name} - subRole: ${user.subRole} -> subRoles: [${newSubRoles.join(', ')}]`);
        
      } catch (userError) {
        console.error(`[ERROR] Error migrating user ${user.name}:`, userError.message);
      }
    }
    
    console.log(`Migration completed! Successfully migrated ${migratedCount}/${users.length} users`);
    
    // Optional: Drop the old subRole column (comment out if you want to keep it for rollback)
    // console.log('Dropping old subRole column...');
    // await sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS "subRole"');
    // console.log('Old subRole column dropped');
    
    process.exit(0);
    
  } catch (error) {
    console.error('[ERROR] Migration failed:', error);
    process.exit(1);
  }
};

migrateSubRolesToArray();