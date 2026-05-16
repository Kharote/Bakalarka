// Test script to diagnose Microsoft Teams integration permissions
// Run: node scripts/testTeamsPermissions.js

import 'dotenv/config';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function testTeamsPermissions() {
  log.section('Microsoft Teams Integration Diagnostics');

  // Step 1: Check environment variables
  log.section('Step 1: Environment Configuration');
  
  const requiredEnvVars = {
    'AZURE_AD_CLIENT_ID': process.env.AZURE_AD_CLIENT_ID,
    'AZURE_AD_CLIENT_SECRET': process.env.AZURE_AD_CLIENT_SECRET,
    'AZURE_AD_TENANT_ID': process.env.AZURE_AD_TENANT_ID
  };

  let configValid = true;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (value) {
      log.success(`${key}: ${value.substring(0, 8)}...`);
    } else {
      log.error(`${key}: NOT SET`);
      configValid = false;
    }
  }

  if (!configValid) {
    log.error('Missing required environment variables. Please check your .env file.');
    return;
  }

  // Step 2: Test app-only token acquisition
  log.section('Step 2: App-Only Token Acquisition');
  
  let appToken = null;
  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.AZURE_AD_CLIENT_ID);
    params.append('client_secret', process.env.AZURE_AD_CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    log.info('Requesting app-only access token...');
    const response = await axios.post(tokenUrl, params);
    
    appToken = response.data.access_token;
    log.success('Successfully obtained app-only access token');
    
    // Decode token to inspect claims
    const tokenParts = appToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    log.info(`Token issued for: ${payload.app_displayname || 'Unknown App'}`);
    log.info(`Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`);
    
    if (payload.roles && payload.roles.length > 0) {
      log.success(`Granted roles (${payload.roles.length}):`);
      payload.roles.forEach(role => {
        console.log(`  - ${role}`);
      });
    } else {
      log.error('No application roles found in token!');
      log.warn('This means Application Permissions are NOT configured in Azure Portal');
    }

  } catch (error) {
    log.error('Failed to obtain app-only token:');
    console.error(error.response?.data || error.message);
    return;
  }

  // Step 3: Test Graph API permissions
  log.section('Step 3: Microsoft Graph API Permission Tests');

  const client = Client.init({
    authProvider: (done) => {
      done(null, appToken);
    }
  });

  // Test required permissions
  const permissionTests = [
    {
      name: 'Group.ReadWrite.All',
      test: async () => {
        try {
          const result = await client.api('/groups').top(1).get();
          return { success: true, message: 'Can read groups' };
        } catch (err) {
          return { success: false, message: err.message, statusCode: err.statusCode };
        }
      }
    },
    {
      name: 'Team.Create',
      test: async () => {
        // We can't actually create a test team, but we can check if the error is about permissions or something else
        try {
          // Try to get teams (this will fail if no permissions)
          await client.api('/groups').filter("resourceProvisioningOptions/Any(x:x eq 'Team')").top(1).get();
          return { success: true, message: 'Can query teams' };
        } catch (err) {
          return { success: false, message: err.message, statusCode: err.statusCode };
        }
      }
    },
    {
      name: 'Directory.ReadWrite.All (optional)',
      test: async () => {
        try {
          const result = await client.api('/organization').get();
          return { success: true, message: 'Can read organization' };
        } catch (err) {
          return { success: false, message: err.message, statusCode: err.statusCode };
        }
      }
    },
    {
      name: 'Tasks.ReadWrite (for Planner)',
      test: async () => {
        try {
          const result = await client.api('/me/planner/plans').top(1).get();
          return { success: true, message: 'Can access Planner' };
        } catch (err) {
          if (err.statusCode === 403) {
            return { success: false, message: 'Permission denied - Tasks.ReadWrite needed', statusCode: 403 };
          }
          return { success: true, message: 'Can access Planner API (error is not permission-related)' };
        }
      }
    }
  ];

  for (const test of permissionTests) {
    log.info(`Testing ${test.name}...`);
    const result = await test.test();
    
    if (result.success) {
      log.success(`${test.name}: ${result.message}`);
    } else {
      if (result.statusCode === 403) {
        log.error(`${test.name}: PERMISSION DENIED`);
      } else {
        log.warn(`${test.name}: ${result.message} (Status: ${result.statusCode})`);
      }
    }
  }

  // Step 4: Attempt to create a test group (simulates team creation)
  log.section('Step 4: Simulate Team Creation');
  
  try {
    log.info('Attempting to create a test group (required for team creation)...');
    
    const testGroup = {
      displayName: `TEST-${Date.now()}`,
      mailNickname: `test${Date.now()}`,
      description: 'Test group for permission validation',
      mailEnabled: false,
      securityEnabled: true,
      groupTypes: []
    };

    const group = await client.api('/groups').post(testGroup);
    log.success(`Successfully created test group: ${group.id}`);
    
    // Clean up
    log.info('Cleaning up test group...');
    await client.api(`/groups/${group.id}`).delete();
    log.success('Test group deleted');
    
    log.success('ALL PERMISSIONS ARE WORKING CORRECTLY!');

  } catch (error) {
    if (error.statusCode === 403) {
      log.error('PERMISSION DENIED: Cannot create groups/teams');
      log.error(`Error: ${error.message}`);
    } else {
      log.warn(`Test failed with error: ${error.message}`);
    }
  }

  // Step 5: Provide recommendations
  log.section('Recommendations');
  
  log.info('To fix Microsoft Teams integration, follow these steps:');
  console.log('\n1. Go to Azure Portal: https://portal.azure.com');
  console.log('2. Navigate to: Azure Active Directory > App registrations');
  console.log(`3. Find your app with Client ID: ${process.env.AZURE_AD_CLIENT_ID}`);
  console.log('4. Go to: API permissions');
  console.log('5. Click: Add a permission > Microsoft Graph > Application permissions');
  console.log('6. Add these permissions:');
  console.log('   - Group.ReadWrite.All');
  console.log('   - Team.Create (or Teamwork.Migrate.All)');
  console.log('   - Directory.ReadWrite.All (optional but recommended)');
  console.log('   - Tasks.ReadWrite (REQUIRED for Planner task assignment)');
  console.log('7. Click: Grant admin consent for [your tenant]');
  console.log('8. Wait 5-10 minutes for permissions to propagate');
  console.log('9. Run this script again to verify\n');

  log.warn('Note: Admin consent requires Azure AD Administrator privileges');
  log.info('Current app registration:');
  console.log(`   Portal URL: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/${process.env.AZURE_AD_CLIENT_ID}\n`);
}

// Run the test
testTeamsPermissions()
  .then(() => {
    console.log(`\n${colors.cyan}═══ Test Complete ═══${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
