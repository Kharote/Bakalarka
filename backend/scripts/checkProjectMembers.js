// Check project members for debugging
import { Project, ProjectMember, User } from '../models/index.js';

const projectId = '21684257-b81a-43f6-9316-3b54cecffd5a'; // From AI suggestions file

async function checkProjectMembers() {
  try {
    console.log('Checking project members...\n');
    
    const project = await Project.findByPk(projectId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'msTeamsUserId'] },
        { 
          model: ProjectMember, 
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'msTeamsUserId', 'subRoles'] }]
        }
      ]
    });

    if (!project) {
      console.error('[ERROR] Project not found');
      process.exit(1);
    }

    console.log('Project:', project.name);
    console.log('Project ID:', project.id);
    console.log('\nOwner:');
    console.log('   Name:', project.owner.name);
    console.log('   Email:', project.owner.email);
    console.log('   MS Teams ID:', project.owner.msTeamsUserId || 'NOT LINKED');
    
    console.log('\nProject Members (from ProjectMember table):');
    console.log('   Total members:', project.members.length);
    
    if (project.members.length === 0) {
      console.log('   [ERROR] NO MEMBERS FOUND!');
    } else {
      project.members.forEach((member, index) => {
        console.log(`\n   Member ${index + 1}:`);
        console.log('      Name:', member.user.name);
        console.log('      Email:', member.user.email);
        console.log('      MS Teams ID:', member.user.msTeamsUserId || 'NOT LINKED');
        console.log('      Sub-roles:', member.user.subRoles || 'none');
        console.log('      Role in project:', member.role);
      });
    }
    
    console.log('\nCheck complete');
    process.exit(0);
    
  } catch (error) {
    console.error('[ERROR] Error:', error);
    process.exit(1);
  }
}

checkProjectMembers();
