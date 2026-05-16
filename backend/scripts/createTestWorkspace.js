// Script to create a test workspace for MS Teams integration testing
import { User, Project, Task, ProjectMember } from '../models/index.js';
import teamsIntegrationService from '../services/teamsIntegrationService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testEmail = 'kanikmartin_gmail.com#EXT#@kanikmartingmail.onmicrosoft.com';

async function createTestWorkspace() {
  try {
    console.log('Creating test workspace for MS Teams integration...');
    console.log('User Email:', testEmail);

    // Find the user
    const user = await User.findOne({ 
      where: { email: testEmail } 
    });

    if (!user) {
      console.error('[ERROR] User not found with email:', testEmail);
      console.log('[INFO] Please login first through Microsoft SSO');
      process.exit(1);
    }

    console.log('User found:', user.name);
    console.log('Microsoft ID:', user.microsoftId);
    console.log('MS Teams User ID:', user.msTeamsUserId || '[WARN] NOT LINKED');

    if (!user.msTeamsUserId) {
      console.error('\n[ERROR] User does not have MS Teams linked!');
      console.log('[INFO] Please link MS Teams account first by clicking "Link MS Teams" in the dashboard');
      process.exit(1);
    }

    // Check if test project already exists
    let project = await Project.findOne({
      where: {
        name: 'MS Teams Test Project',
        ownerId: user.id
      }
    });

    if (project) {
      console.log('\n[WARN] Test project already exists with ID:', project.id);
      console.log('Deleting old test project...');
      
      // Delete associated tasks first
      await Task.destroy({ where: { projectId: project.id } });
      await project.destroy();
      
      console.log('Old test project deleted');
    }

    // Create a new test project
    console.log('\nCreating new test project...');
    project = await Project.create({
      name: 'MS Teams Test Project',
      description: 'Test project to verify MS Teams integration is working correctly',
      status: 'active',
      priority: 'medium',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ownerId: user.id,
      aiStatus: 'approved',
      msTeamsChannelId: null, // Will be created by MS Teams integration
      msTeamsChannelName: null
    });

    console.log('Test project created successfully!');
    console.log('Project details:');
    console.log('   - ID:', project.id);
    console.log('   - Name:', project.name);
    console.log('   - Status:', project.status);
    console.log('   - Created by:', user.name);

    // Add user as project member
    console.log('\nAdding user as project member...');
    await ProjectMember.create({
      projectId: project.id,
      userId: user.id,
      role: 'owner'
    });
    console.log('User added as project owner');

    // Create test tasks
    console.log('\nCreating test tasks...');
    
    const tasks = [
      {
        title: 'Setup MS Teams Channel',
        description: 'Verify that MS Teams channel is created correctly',
        status: 'todo',
        priority: 'high',
        projectId: project.id,
        assignedToId: user.id,
        createdById: user.id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: 2
      },
      {
        title: 'Test Task Assignment',
        description: 'Verify that tasks can be assigned through MS Teams',
        status: 'todo',
        priority: 'medium',
        projectId: project.id,
        assignedToId: user.id,
        createdById: user.id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedHours: 3
      },
      {
        title: 'Test Notifications',
        description: 'Verify that notifications are sent to MS Teams',
        status: 'todo',
        priority: 'medium',
        projectId: project.id,
        assignedToId: user.id,
        createdById: user.id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        estimatedHours: 2
      }
    ];

    for (const taskData of tasks) {
      const task = await Task.create(taskData);
      console.log('   [OK]', task.title);
    }

    // Create MS Teams workspace
    console.log('\nCreating MS Teams workspace...');
    try {
      const teamMembers = [{
        userId: user.id,
        email: user.email,
        name: user.name,
        role: 'owner',
        msTeamsUserId: user.msTeamsUserId
      }];

      const teamsResult = await teamsIntegrationService.createProjectTeam(
        {
          name: project.name,
          description: project.description,
          projectManagerId: user.msTeamsUserId
        },
        teamMembers
      );

      // Update project with Teams info
      project.msTeamsChannelId = teamsResult.teamId;
      project.msTeamsChannelName = teamsResult.displayName;
      project.teamsChannelId = teamsResult.teamId;
      project.teamsWebUrl = teamsResult.webUrl;
      await project.save();

      console.log('MS Teams workspace created successfully!');
      console.log('   - Team ID:', teamsResult.teamId);
      console.log('   - Web URL:', teamsResult.webUrl);

      // Create project channels
      console.log('\nCreating project channels...');
      const channels = await teamsIntegrationService.createProjectChannels(teamsResult.teamId);
      console.log(`Created ${channels.length} project channels`);

    } catch (error) {
      console.error('[WARN] Failed to create MS Teams workspace:', error.message);
      console.log('[INFO] You can manually create the Teams workspace from the application');
    }

    console.log('\nTest workspace created successfully!');
    console.log('Summary:');
    console.log('   - Project:', project.name);
    console.log('   - Tasks created:', tasks.length);
    console.log('   - Owner:', user.name);
    console.log('   - MS Teams User ID:', user.msTeamsUserId);
    console.log('\nNext steps:');
    console.log('   1. Login to the application');
    console.log('   2. Navigate to Projects page');
    console.log('   3. Open "MS Teams Test Project"');
    console.log('   4. Verify MS Teams channel is created');
    console.log('   5. Test task assignments and notifications');

  } catch (error) {
    console.error('[ERROR] Error creating test workspace:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the script
createTestWorkspace()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[ERROR] Script failed:', error.message);
    process.exit(1);
  });
