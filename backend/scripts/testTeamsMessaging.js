// Test script for Teams messaging permissions (Teamwork.Migrate.All)
// Run: node scripts/testTeamsMessaging.js

import 'dotenv/config';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';

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
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function getAppOnlyToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.AZURE_AD_CLIENT_ID);
  params.append('client_secret', process.env.AZURE_AD_CLIENT_SECRET);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(tokenUrl, params);
  return response.data.access_token;
}

async function testTeamsMessaging() {
  log.section('Microsoft Teams Messaging Permission Test');

  // Step 1: Get token and check permissions
  log.section('Step 1: Token & Permissions Check');
  
  let accessToken;
  try {
    accessToken = await getAppOnlyToken();
    log.success('Got app-only access token');
    
    const tokenParts = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    if (payload.roles && payload.roles.length > 0) {
      log.success(`Token has ${payload.roles.length} application roles:`);
      payload.roles.forEach(role => {
        console.log(`  - ${role}`);
        if (role === 'Teamwork.Migrate.All') {
          log.success('  Teamwork.Migrate.All is present!');
        }
      });
      
      if (!payload.roles.includes('Teamwork.Migrate.All')) {
        log.warn('Missing Teamwork.Migrate.All permission');
        log.info('This permission is required to send messages to Teams channels');
      }
    } else {
      log.error('No application roles in token');
      return;
    }
  } catch (error) {
    log.error('Failed to get token: ' + error.message);
    return;
  }

  // Step 2: Initialize Graph client
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  // Step 3: List available teams
  log.section('Step 2: Finding Teams');
  
  let teams = [];
  try {
    const result = await client.api('/groups')
      .filter("resourceProvisioningOptions/Any(x:x eq 'Team')")
      .select('id,displayName,description')
      .top(10)
      .get();
    
    teams = result.value || [];
    
    if (teams.length === 0) {
      log.warn('No teams found in this tenant');
      log.info('Create a team first before testing messaging');
      return;
    }
    
    log.success(`Found ${teams.length} teams:`);
    teams.forEach((team, idx) => {
      console.log(`  ${idx + 1}. ${team.displayName} (${team.id})`);
    });
  } catch (error) {
    log.error('Failed to list teams: ' + error.message);
    return;
  }

  // Step 4: Get channels from first team
  log.section('Step 3: Finding Channels');
  
  const testTeam = teams[0];
  log.info(`Using team: ${testTeam.displayName}`);
  
  let channels = [];
  try {
    const result = await client.api(`/teams/${testTeam.id}/channels`).get();
    channels = result.value || [];
    
    if (channels.length === 0) {
      log.warn('No channels found in team');
      return;
    }
    
    log.success(`Found ${channels.length} channels:`);
    channels.forEach((channel, idx) => {
      console.log(`  ${idx + 1}. ${channel.displayName} (${channel.id})`);
    });
  } catch (error) {
    log.error('Failed to list channels: ' + error.message);
    return;
  }

  // Step 5: Test sending message using migration API
  log.section('Step 4: Testing Message Send (Migration API)');
  
  const testChannel = channels.find(c => c.displayName === 'General') || channels[0];
  log.info(`Using channel: ${testChannel.displayName}`);
  
  try {
    // Step 1: Put team in migration mode
    log.info('Step 1: Putting team in migration mode...');
    await client
      .api(`/teams/${testTeam.id}`)
      .patch({
        '@microsoft.graph.teamCreationMode': 'migration'
      });
    log.success('Team in migration mode');
    
    // Step 2: Send message with historical timestamp
    log.info('Step 2: Sending test message...');
    const testMessage = {
      body: {
        contentType: 'html',
        content: `<div style="padding: 10px; border-left: 4px solid #4f46e5; background-color: #f8fafc;">
          <h3 style="color: #4f46e5; margin: 0;">Test Message from PM-AI</h3>
          <p style="margin: 10px 0;">This is a test message using Teamwork.Migrate.All permission with migration API.</p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Sent at: ${new Date().toLocaleString()}</p>
        </div>`
      },
      importance: 'normal',
      createdDateTime: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      from: {
        user: {
          displayName: 'AI Assistant',
          userIdentityType: 'aadUser'
        }
      }
    };

    const sentMessage = await client
      .api(`/teams/${testTeam.id}/channels/${testChannel.id}/messages`)
      .post(testMessage);
    
    log.success('Message sent successfully');
    log.success(`Message ID: ${sentMessage.id}`);
    
    // Step 3: Complete migration
    log.info('Step 3: Completing migration...');
    await client
      .api(`/teams/${testTeam.id}/completeMigration`)
      .post({});
    
    log.success('Migration completed');
    log.success(`Check the "${testChannel.displayName}" channel in "${testTeam.displayName}" team in Microsoft Teams`);
    
  } catch (error) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      log.error('PERMISSION DENIED');
      log.error('Error: ' + error.message);
      log.warn('Issue with Teamwork.Migrate.All permission or migration API setup');
    } else if (error.statusCode === 400) {
      log.error('BAD REQUEST');
      log.error('Error: ' + error.message);
      log.warn('Migration API may not be configured correctly');
    } else {
      log.error('Failed to send message: ' + error.message);
      console.error(error);
    }
    return;
  }

  // Summary
  log.section('Test Complete');
  log.success('All tests passed! Teams messaging is working correctly.');
  log.info('You can now send AI content to Teams channels from your application.');
}

// Run test
testTeamsMessaging()
  .then(() => {
    console.log(`\n${colors.cyan}═══ Done ═══${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[ERROR] Fatal error:', error);
    process.exit(1);
  });
