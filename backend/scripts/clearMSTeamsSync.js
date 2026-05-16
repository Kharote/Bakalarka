// Script to clear MS Teams integration for all users
// This will force all users to re-link their MS Teams accounts with new permissions
import { User } from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function clearMSTeamsSync() {
  try {
    console.log('Clearing MS Teams integration for all users...');

    // Update all users to clear msTeamsUserId
    const result = await User.update(
      { msTeamsUserId: null },
      { where: {} }
    );

    console.log(`Cleared MS Teams integration for ${result[0]} users`);
    console.log('\nAll users will now need to re-link their MS Teams accounts');
    console.log('[INFO] They will see the warning banner and must accept new permissions');
    
  } catch (error) {
    console.error('[ERROR] Error clearing MS Teams integration:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the script
clearMSTeamsSync()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[ERROR] Script failed:', error.message);
    process.exit(1);
  });
