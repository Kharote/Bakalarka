/**
 * AI Seed Script — TechZone E-shop SCRUM project
 * Generates real AI-based project plan via Gemini API
 *
 * Run: node scripts/ai-seed-eshop.js
 */

const BASE_URL = 'http://localhost:9801';
const ADMIN_EMAIL = 'tomas.kovac@techzone.sk';
const ADMIN_PASSWORD = 'Heslo123!';
const OLD_PROJECT_ID = '26d27f56-3efd-4f7c-b4ca-8c77d4925a3c';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}:`, text.slice(0, 300));
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TechZone E-shop — AI Project Seed');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── 1. Login ────────────────────────────────────────────────────────────
  console.log('1️⃣  Logging in as admin...');
  const loginData = await request('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = loginData.token;
  const adminId = loginData.user?.id;
  console.log(`   ✅ Logged in: ${loginData.user?.name} (${loginData.user?.role})`);
  console.log(`   ID: ${adminId}\n`);

  // ─── 2. Load team member IDs ────────────────────────────────────────────
  console.log('2️⃣  Loading team members...');
  const usersData = await request('GET', '/api/users', null, token);
  const allUsers = usersData.users || usersData.data || usersData;
  const members = Array.isArray(allUsers) ? allUsers : [];

  const findUser = (email) => members.find((u) => u.email === email);
  const lukas  = findUser('lukas.horvath@techzone.sk');
  const martina = findUser('martina.blaho@techzone.sk');
  const peter  = findUser('peter.simko@techzone.sk');
  const tomas  = findUser('tomas.kovac@techzone.sk');

  if (!tomas || !lukas || !martina || !peter) {
    console.error('Could not find all team members. Found:', members.map((u) => u.email));
    process.exit(1);
  }
  console.log(`   ✅ ${tomas.name} (PM/Admin)`);
  console.log(`   ✅ ${lukas.name} (Frontend Dev)`);
  console.log(`   ✅ ${martina.name} (Backend Dev)`);
  console.log(`   ✅ ${peter.name} (QA/DevOps)\n`);

  // ─── 3. Delete old mock project ─────────────────────────────────────────
  console.log('3️⃣  Deleting old mock project...');
  try {
    await request('DELETE', `/api/projects/${OLD_PROJECT_ID}`, null, token);
    console.log('   ✅ Old project deleted\n');
  } catch {
    console.log('   ⚠️  Old project not found or already deleted — continuing\n');
  }

  // ─── 4. Create fresh project shell ──────────────────────────────────────
  console.log('4️⃣  Creating new project shell...');
  const projectPayload = {
    name: 'TechZone E-shop — Predaj PC, notebookov a tabletov',
    description:
      'Vývoj kompletného e-commerce riešenia pre predaj počítačov, notebookov, tabletov ' +
      'a príslušenstva. Projekt zahŕňa frontend (React), backend API (Node.js/Express), ' +
      'databázu, platobný systém a CI/CD pipeline. Tím pracuje agilnou SCRUM metodikou ' +
      'v dvojtýždňových šprintoch.',
    startDate: '2026-06-01',
    endDate: '2026-11-28',
    priority: 'high',
    status: 'planning',
    budget: 50000,
    tags: ['e-commerce', 'react', 'nodejs', 'scrum', 'eshop'],
    locale: 'sk',
  };
  const createData = await request('POST', '/api/projects', projectPayload, token);
  const projectId = createData.project?.id || createData.data?.id || createData.id;
  console.log(`   ✅ Project created: "${createData.project?.name || projectPayload.name}"`);
  console.log(`   ID: ${projectId}\n`);

  // ─── 5. Add team members to project ─────────────────────────────────────
  console.log('5️⃣  Adding team members to project...');
  const memberRoles = [
    { userId: tomas.id,   role: 'owner'  },
    { userId: lukas.id,   role: 'member' },
    { userId: martina.id, role: 'member' },
    { userId: peter.id,   role: 'member' },
  ];

  for (const m of memberRoles) {
    try {
      await request('POST', `/api/projects/${projectId}/members`, m, token);
      console.log(`   ✅ Added member: ${m.userId.slice(0, 8)}... as ${m.role}`);
    } catch {
      console.log(`   ⚠️  Member ${m.userId.slice(0, 8)}... may already be added`);
    }
  }
  console.log();

  // ─── 6. Generate AI suggestions via Gemini ──────────────────────────────
  console.log('6️⃣  Generating AI project plan via Gemini...');
  console.log('   (This may take 30–60 seconds while Gemini analyzes the project)\n');

  const aiPayload = {
    name: projectPayload.name,
    description: projectPayload.description,
    startDate: '2026-06-01',
    endDate: '2026-11-28',
    priority: 'high',
    tags: projectPayload.tags,
    budget: 50000,
    projectId,
    locale: 'sk',
    selectedModel: 'gemini-2.5-flash',
    projectManagerId: tomas.id,
    generateTasks: true,
    generateRisks: true,
    generateGantt: true,
    teamMembers: [
      {
        id: tomas.id,
        name: tomas.name,
        email: tomas.email,
        role: 'Project Manager / Tech Lead',
        subRoles: tomas.subRoles || [],
      },
      {
        id: lukas.id,
        name: lukas.name,
        email: lukas.email,
        role: 'Frontend Developer',
        subRoles: lukas.subRoles || [],
      },
      {
        id: martina.id,
        name: martina.name,
        email: martina.email,
        role: 'Backend Developer',
        subRoles: martina.subRoles || [],
      },
      {
        id: peter.id,
        name: peter.name,
        email: peter.email,
        role: 'QA Engineer / DevOps',
        subRoles: peter.subRoles || [],
      },
    ],
  };

  const aiResponse = await request(
    'POST',
    '/api/projects/generate-ai-suggestions',
    aiPayload,
    token,
  );

  const suggestionId = aiResponse.data?.suggestionId;
  const analysis    = aiResponse.data?.analysis;

  if (!suggestionId || !analysis) {
    console.error('❌ AI generation failed — unexpected response:', JSON.stringify(aiResponse).slice(0, 400));
    process.exit(1);
  }

  console.log(`   ✅ AI analysis complete! Suggestion ID: ${suggestionId}`);
  console.log(`   📋 Tasks generated:  ${analysis.tasks?.length ?? 0}`);
  console.log(`   ⚠️  Risks generated: ${analysis.risks?.length ?? 0}`);
  console.log(`   📅 Gantt chart:      ${analysis.ganttChart?.imagePath ? '✅ ' + analysis.ganttChart.imagePath.split('/').pop() : '—'}\n`);

  if (analysis.tasks?.length) {
    console.log('   Sample tasks from AI:');
    analysis.tasks.slice(0, 5).forEach((t, i) => {
      console.log(`     ${i + 1}. [${t.sprint || 'Sprint?'}] ${t.name} (${t.priority || '?'}) → ${t.assignedRole || '?'}`);
    });
    if (analysis.tasks.length > 5) console.log(`     ... and ${analysis.tasks.length - 5} more`);
    console.log();
  }

  // ─── 7. Apply AI suggestions ─────────────────────────────────────────────
  console.log('7️⃣  Applying AI suggestions to project (creating tasks in DB)...');
  const applyResponse = await request(
    'POST',
    `/api/projects/${projectId}/apply-ai-suggestions`,
    {
      suggestionId,
      tasks:    analysis.tasks    || [],
      risks:    analysis.risks    || [],
      timeline: analysis.timeline || null,
    },
    token,
  );

  console.log(`   ✅ Tasks created in DB: ${applyResponse.data?.tasksCreated ?? applyResponse.tasksCreated ?? '?'}`);
  console.log(`   ✅ Risks stored:        ${applyResponse.data?.risksStored  ?? applyResponse.risksStored  ?? '?'}`);
  if (applyResponse.data?.errors?.length) {
    console.log(`   ⚠️  Errors: ${applyResponse.data.errors.join(', ')}`);
  }
  console.log();

  // ─── Done ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ AI project generation complete!');
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Open: http://localhost:5173/projects/${projectId}`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
