// Add subRole column to existing users
// Run this script to update the database schema

import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';

const addSubRoleColumn = async () => {
  try {
    console.log('Adding subRole column to users table...');
    
    // This will sync the model with the database
    // It will add the new subRole column
    await sequelize.sync({ alter: true });
    
    console.log('✅ Successfully added subRole column');
    
    // Set default subRole for existing users
    const usersWithoutSubRole = await User.findAll({
      where: {
        subRole: null
      }
    });
    
    if (usersWithoutSubRole.length > 0) {
      console.log(`Setting default subRole for ${usersWithoutSubRole.length} existing users...`);
      
      await User.update(
        { subRole: 'none' },
        { 
          where: { 
            subRole: null 
          } 
        }
      );
      
      console.log('✅ Updated existing users with default subRole');
    }
    
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding subRole column:', error);
    process.exit(1);
  }
};

addSubRoleColumn();