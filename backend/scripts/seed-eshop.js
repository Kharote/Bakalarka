/**
 * Seed script — E-shop TechZone SCRUM demo data (Slovak)
 * Run: node scripts/seed-eshop.js
 */
import 'dotenv/config';
import { sequelize } from '../config/database.js';
import connectDatabase from '../config/database.js';

import '../models/index.js';
import { User, Project, ProjectMember, Task } from '../models/index.js';

async function main() {
  await connectDatabase();
  console.log('=== Seedovanie dát pre E-shop TechZone ===\n');

  const PLAIN_PASSWORD = 'Heslo123!';

  // ── 1. USERS ─────────────────────────────────────────────────────────────────
  console.log('Vytváram používateľov...');

  const [admin] = await User.findOrCreate({
    where: { email: 'tomas.kovac@techzone.sk' },
    defaults: {
      name: 'Tomáš Kováč',
      password: PLAIN_PASSWORD,
      role: 'admin',
      department: 'IT Management',
      position: 'Projektový manažér / Scrum Master',
      subRoles: ['Project Manager', 'Scrum Master'],
      bio: 'Skúsený projektový manažér s 8 rokmi praxe v agilnom riadení IT projektov. Certifikovaný Scrum Master (CSM) a PMP. Viedol viacero úspešných e-commerce projektov pre slovenské firmy vrátane nasadenia B2C platforiem pre predaj elektroniky. Špecializuje sa na koordináciu vývojových tímov, plánovanie sprintov a komunikáciu so zákazníkmi. V minulosti pracoval ako senior developer a má tak hlboké technické porozumenie produktu.',
      isActive: true,
    },
  });
  console.log(`  ✓ Admin/PM: ${admin.name} (${admin.id})`);

  const [dev] = await User.findOrCreate({
    where: { email: 'lukas.horvath@techzone.sk' },
    defaults: {
      name: 'Lukáš Horváth',
      password: PLAIN_PASSWORD,
      role: 'pm',
      department: 'Vývoj softvéru',
      position: 'Senior Frontend Developer',
      subRoles: ['Frontend Developer', 'UI/UX Designer'],
      bio: 'Senior frontend developer so 6 rokmi skúseností vo Vue.js, React a moderných CSS frameworkoch. Špecializuje sa na tvorbu responzívnych e-commerce rozhraní s dôrazom na konverzné optimalizácie a používateľský zážitok. Má skúsenosti s integráciou platobných brán (Stripe, PayPal) a implementáciou produktových katalógov s pokročilým filtrovaním. Aktívne prispieva do open-source komunity a hovorí plynulo anglicky aj nemecky.',
      isActive: true,
    },
  });
  console.log(`  ✓ Frontend Dev: ${dev.name} (${dev.id})`);

  const [backend] = await User.findOrCreate({
    where: { email: 'martina.blaho@techzone.sk' },
    defaults: {
      name: 'Martina Blaho',
      password: PLAIN_PASSWORD,
      role: 'user',
      department: 'Vývoj softvéru',
      position: 'Backend Developer',
      subRoles: ['Backend Developer', 'Database Administrator'],
      bio: 'Backend developer s 5-ročnou praxou v Node.js, PostgreSQL a REST API dizajne. Má hlboké skúsenosti s návrhom databázových schém pre e-commerce systémy — správa produktových katalógov, objednávkové toky, skladové hospodárstvo a integrácia s ERP systémami. Certifikovaná v AWS (Solutions Architect Associate). Zaujíma sa o bezpečnosť API, optimalizáciu SQL dopytov a mikroservisovú architektúru.',
      isActive: true,
    },
  });
  console.log(`  ✓ Backend Dev: ${backend.name} (${backend.id})`);

  const [qa] = await User.findOrCreate({
    where: { email: 'peter.simko@techzone.sk' },
    defaults: {
      name: 'Peter Šimko',
      password: PLAIN_PASSWORD,
      role: 'user',
      department: 'Kvalita a testovanie',
      position: 'QA Engineer / DevOps',
      subRoles: ['QA Engineer', 'DevOps Engineer'],
      bio: 'QA inžinier a DevOps špecialista s 4 rokmi praxe v testovaní webových aplikácií a automatizácii CI/CD pipeline. Pracuje s Cypress, Selenium a Postman pre automatizované testy e-commerce platforiem. Spravuje Docker a Kubernetes infraštruktúru, monitorovanie pomocou Grafana a nasadzovanie na AWS. Má skúsenosti s výkonnostným testovaním (k6, JMeter) a zaručuje, že každý release spĺňa SLA požiadavky.',
      isActive: true,
    },
  });
  console.log(`  ✓ QA/DevOps: ${qa.name} (${qa.id})`);

  // ── 2. PROJECT ────────────────────────────────────────────────────────────────
  console.log('\nVytváranie projektu...');

  const [project] = await Project.findOrCreate({
    where: { name: 'TechZone E-shop — Predaj PC, notebookov a tabletov' },
    defaults: {
      description: 'Vývoj kompletnej B2C e-commerce platformy pre predaj počítačov, notebookov, tabletov a príslušenstva. Systém bude obsahovať produktový katalóg s pokročilým filtrovaním, košík, platobné brány (Stripe + GoPay), správu objednávok, skladové hospodárstvo a administrátorský panel. Projekt je realizovaný agilnou metodológiou SCRUM v dvojtýždenných sprintoch.',
      startDate: '2026-06-01',
      endDate: '2026-11-28',
      priority: 'high',
      status: 'active',
      progress: 28,
      budget: 45000,
      tags: ['e-commerce', 'Vue.js', 'Node.js', 'PostgreSQL', 'SCRUM'],
      ownerId: admin.id,
      locale: 'sk',
    },
  });
  console.log(`  ✓ Projekt: ${project.name} (${project.id})`);

  // Project members
  for (const [user, role] of [[admin, 'owner'], [dev, 'manager'], [backend, 'member'], [qa, 'member']]) {
    await ProjectMember.findOrCreate({
      where: { projectId: project.id, userId: user.id },
      defaults: { role },
    });
  }
  console.log('  ✓ Členovia tímu priradení');

  // ── 3. TASKS ──────────────────────────────────────────────────────────────────
  const allTasks = [
    // Sprint 1 — Základ systému (dokončené)
    {
      title: 'Návrh databázovej schémy pre produktový katalóg',
      description: 'Navrhnúť PostgreSQL schému pre tabuľky: products, categories, product_attributes, product_images, inventory. Zohľadniť hierarchickú kategorizáciu (PC → Herné PC, Kancelárske PC), varianty produktov (farba, RAM, SSD) a viacero skladov.',
      assignedToId: backend.id, status: 'completed', priority: 'critical',
      startDate: '2026-06-01', dueDate: '2026-06-07', estimatedHours: 16, actualHours: 14,
      tags: ['databáza', 'backend', 'sprint-1'], aiGenerated: false,
    },
    {
      title: 'Implementácia REST API — správa produktov (CRUD)',
      description: 'Vytvoriť Node.js/Express endpointy: GET /products (filtrovanie, stránkovanie, triedenie), GET /products/:id, POST /products (admin), PUT /products/:id (admin), DELETE /products/:id (admin). Implementovať Sequelize modely a vzťahy.',
      assignedToId: backend.id, status: 'completed', priority: 'critical',
      startDate: '2026-06-08', dueDate: '2026-06-20', estimatedHours: 32, actualHours: 36,
      tags: ['api', 'backend', 'sprint-1'], aiGenerated: false,
    },
    {
      title: 'Vue.js komponent — produktový katalóg s filtrovaním',
      description: 'Vytvoriť responzívnu stránku katalógu s PrimeVue komponentmi. Implementovať bočný panel s filtrami (kategória, cena, značka, hodnotenie), triedenie produktov a nekonečné scrollovanie. Optimalizovať pre mobilné zariadenia.',
      assignedToId: dev.id, status: 'completed', priority: 'high',
      startDate: '2026-06-08', dueDate: '2026-06-21', estimatedHours: 40, actualHours: 44,
      tags: ['frontend', 'Vue.js', 'sprint-1'], aiGenerated: false,
    },
    {
      title: 'Nastavenie CI/CD pipeline — GitHub Actions + Docker',
      description: 'Nakonfigurovať GitHub Actions workflow pre automatické testovanie, build Docker images a nasadenie na staging prostredie (AWS ECS). Nastaviť secrets, environment variables a notifikácie do Slack kanálu.',
      assignedToId: qa.id, status: 'completed', priority: 'high',
      startDate: '2026-06-01', dueDate: '2026-06-14', estimatedHours: 20, actualHours: 18,
      tags: ['devops', 'CI/CD', 'sprint-1'], aiGenerated: false,
    },
    {
      title: 'Sprint 1 Review a retrospektíva',
      description: 'Prezentácia výsledkov Sprint 1 stakeholderom — demo produktového katalógu a API. Retrospektíva: čo išlo dobre, čo zlepšiť v Sprint 2. Aktualizácia backlogu podľa spätnej väzby.',
      assignedToId: admin.id, status: 'completed', priority: 'medium',
      startDate: '2026-06-22', dueDate: '2026-06-22', estimatedHours: 4, actualHours: 4,
      tags: ['scrum', 'sprint-1'], aiGenerated: false,
    },
    // Sprint 2 — Košík a checkout (v priebehu)
    {
      title: 'Implementácia nákupného košíka — backend (sessions + DB)',
      description: 'Vytvoriť systém košíka s podporou pre neprihlásených používateľov (session-based) aj prihlásených (DB-based). Endpointy: POST /cart/add, DELETE /cart/remove/:itemId, PATCH /cart/quantity, GET /cart, POST /cart/merge (po prihlásení).',
      assignedToId: backend.id, status: 'completed', priority: 'critical',
      startDate: '2026-06-23', dueDate: '2026-07-04', estimatedHours: 24, actualHours: 28,
      tags: ['backend', 'košík', 'sprint-2'], aiGenerated: false,
    },
    {
      title: 'Vue.js — stránka nákupného košíka a mini-košík v navbari',
      description: 'Implementovať CartView komponent (zoznam položiek, zmena množstva, odstránenie, zľavový kód, súhrn ceny s DPH). Mini-košík slide-over panel v navigácii s real-time aktualizáciou cez Pinia store.',
      assignedToId: dev.id, status: 'completed', priority: 'critical',
      startDate: '2026-06-23', dueDate: '2026-07-05', estimatedHours: 32, actualHours: 30,
      tags: ['frontend', 'košík', 'sprint-2'], aiGenerated: false,
    },
    {
      title: 'Integrácia platobnej brány Stripe',
      description: 'Integrovať Stripe Checkout pre platby kartou. Implementovať webhook handler pre spracovanie platobných udalostí (payment_intent.succeeded, payment_intent.payment_failed). Nastaviť testovanie s testnými kartami a 3D Secure flow.',
      assignedToId: backend.id, status: 'in-progress', priority: 'critical',
      startDate: '2026-07-06', dueDate: '2026-07-18', estimatedHours: 28, actualHours: 12,
      tags: ['platby', 'Stripe', 'backend', 'sprint-2'], aiGenerated: false,
    },
    {
      title: 'Checkout multi-step formulár — Vue.js',
      description: 'Implementovať 4-krokový checkout wizard: (1) Adresa doručenia s autocomplete (Google Places API), (2) Spôsob dopravy (Packeta, Slovenská pošta, GLS), (3) Platba (Stripe, dobierka, prevod), (4) Potvrdenie a súhrn objednávky.',
      assignedToId: dev.id, status: 'in-progress', priority: 'high',
      startDate: '2026-07-06', dueDate: '2026-07-19', estimatedHours: 36, actualHours: 16,
      tags: ['frontend', 'checkout', 'sprint-2'], aiGenerated: false,
    },
    {
      title: 'End-to-end testy nákupného procesu — Cypress',
      description: 'Napísať Cypress E2E testy pre celý nákupný flow: vyhľadanie produktu → pridanie do košíka → checkout → platba (Stripe test mode) → potvrdenie objednávky. Pokryť edge cases: vypredaný produkt, neplatná karta, session expiry.',
      assignedToId: qa.id, status: 'todo', priority: 'high',
      startDate: '2026-07-14', dueDate: '2026-07-20', estimatedHours: 20, actualHours: 0,
      tags: ['QA', 'Cypress', 'sprint-2'], aiGenerated: false,
    },
    // Sprint 3 — Admin panel a sklady (plánované)
    {
      title: 'Administrátorský panel — správa produktového katalógu',
      description: 'Vytvoriť admin rozhranie pre správu produktov: pridávanie/editácia s hromadným nahrávaním fotiek (S3), správa kategórií (drag-and-drop strom), import produktov z CSV/Excel, správa atribútov a variantov.',
      assignedToId: dev.id, status: 'todo', priority: 'high',
      startDate: '2026-07-21', dueDate: '2026-08-08', estimatedHours: 48, actualHours: 0,
      tags: ['admin', 'frontend', 'sprint-3'], aiGenerated: false,
    },
    {
      title: 'Systém správy skladu a rezervácie zásob',
      description: 'Implementovať skladový systém: sledovanie stavu zásob v reálnom čase, automatické rezervovanie kusov pri pridaní do košíka (s timeoutom 15 min), uvoľnenie rezervácie pri expirácii, upozornenia na nízky stav, multi-sklad podpora.',
      assignedToId: backend.id, status: 'todo', priority: 'high',
      startDate: '2026-07-21', dueDate: '2026-08-07', estimatedHours: 36, actualHours: 0,
      tags: ['backend', 'sklad', 'sprint-3'], aiGenerated: false,
    },
    {
      title: 'Dashboard s predajnou analytikou — grafy a KPI',
      description: 'Vytvoriť admin dashboard s Chart.js grafmi: denné/týždenné/mesačné tržby, top predávané produkty, konverzný funnel, priemerná hodnota objednávky, prehľad nových vs. vracajúcich sa zákazníkov. Export reportov do PDF/Excel.',
      assignedToId: dev.id, status: 'todo', priority: 'medium',
      startDate: '2026-08-10', dueDate: '2026-08-22', estimatedHours: 32, actualHours: 0,
      tags: ['admin', 'analytika', 'sprint-3'], aiGenerated: false,
    },
    {
      title: 'Výkonnostné testovanie — load testy (k6)',
      description: 'Napísať k6 load testy pre kritické endpointy: GET /products (1000 concurrent users), POST /cart/add (500 req/s), checkout flow. Identifikovať bottlenecky, optimalizovať SQL dopyty, nastaviť Redis cache. SLA: p95 < 200ms.',
      assignedToId: qa.id, status: 'todo', priority: 'high',
      startDate: '2026-08-10', dueDate: '2026-08-20', estimatedHours: 24, actualHours: 0,
      tags: ['QA', 'výkon', 'k6', 'sprint-3'], aiGenerated: false,
    },
    {
      title: 'Bezpečnostný audit a penetračné testovanie',
      description: 'Vykonať OWASP Top 10 audit: SQL injection, XSS, CSRF, rate limiting, autentifikačné tokeny, správa sessions. Implementovať Content Security Policy, Subresource Integrity a bezpečné HTTP hlavičky.',
      assignedToId: qa.id, status: 'todo', priority: 'critical',
      startDate: '2026-08-21', dueDate: '2026-08-30', estimatedHours: 20, actualHours: 0,
      tags: ['bezpečnosť', 'audit', 'sprint-3'], aiGenerated: false,
    },
  ];

  console.log('\nVytváranie úloh...');
  for (const taskData of allTasks) {
    const [task, created] = await Task.findOrCreate({
      where: { title: taskData.title, projectId: project.id },
      defaults: { ...taskData, projectId: project.id, createdById: admin.id },
    });
    const sprint = task.tags?.[task.tags.length - 1] ?? '';
    console.log(`  ${created ? '✓' : '~'} [${sprint}] ${task.title.substring(0, 58)}`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SEEDOVANIE DOKONČENÉ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Projekt ID  : ${project.id}`);
  console.log(`Admin login : tomas.kovac@techzone.sk  / Heslo123!`);
  console.log(`PM login    : lukas.horvath@techzone.sk / Heslo123!`);
  console.log(`Backend dev : martina.blaho@techzone.sk / Heslo123!`);
  console.log(`QA/DevOps   : peter.simko@techzone.sk   / Heslo123!`);
  console.log(`Úlohy: 5× Sprint 1 (dokončené) | 5× Sprint 2 (prebieha) | 5× Sprint 3 (plánované)`);

  await sequelize.close();
}

main().catch(err => {
  console.error('\n✗ Chyba:', err.message);
  process.exit(1);
});
