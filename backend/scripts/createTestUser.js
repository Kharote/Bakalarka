// Script to prepare existing user for MS Teams integration testing
import { Sequelize } from 'sequelize';
import { User } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const testEmail = 'martin.kanik@soitron.com';

async function prepareTestUser() {
  try {
    console.log('Preparing existing user for MS Teams integration test...');
    console.log('Email:', testEmail);

    // Find existing user
    const user = await User.findOne({ 
      where: { 
        email: testEmail 
      } 
    });

    if (!user) {
      console.error('[ERROR] User not found with email:', testEmail);
      console.log('\n[INFO] Please check the email address or login first through Microsoft SSO');
      process.exit(1);
    }

    console.log('User found with ID:', user.id);
    console.log('Current details:');
    console.log('   - Name:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - Microsoft ID:', user.microsoftId || 'Not set');
    console.log('   - MS Teams User ID:', user.msTeamsUserId || 'Not linked');
    
    // Clear msTeamsUserId to test linking
    if (user.msTeamsUserId) {
      console.log('\nClearing msTeamsUserId to test link flow...');
      user.msTeamsUserId = null;
      await user.save();
      console.log('msTeamsUserId cleared successfully');
    } else {
      console.log('\nUser already ready for testing (no MS Teams linked)');
    }
    
    console.log('\nUser is ready for MS Teams linking test!');
    console.log('[INFO] Log in with this account and click "Link MS Teams" in the dashboard');

    return user;

  } catch (error) {
    console.error('[ERROR] Error preparing test user:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the script
prepareTestUser()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[ERROR] Script failed:', error.message);
    process.exit(1);
  });
