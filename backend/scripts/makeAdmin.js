// Script to promote user to admin role
// Run this script to make a user an administrator

import dotenv from 'dotenv';
import { User } from '../models/index.js';
import connectDatabase from '../config/database.js';

// Load environment variables
dotenv.config();

const promoteUserToAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    const userEmail = 'kanikmartin_gmail.com#EXT#@kanikmartingmail.onmicrosoft.com';
    
    // Find the user
    const user = await User.findOne({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.log(`❌ User not found with email: ${userEmail}`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);
    
    // Update role to admin
    await user.update({ role: 'admin' });
    
    console.log(`✅ Successfully promoted ${user.name} to admin role`);
    
    // Verify the change
    await user.reload();
    console.log(`✅ Verified: User role is now ${user.role}`);
    
  } catch (error) {
    console.error('❌ Error promoting user to admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run the script
promoteUserToAdmin();