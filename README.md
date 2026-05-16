# AI Project Management System

AI-powered project management system with Microsoft Teams integration, built with a Node.js/Express backend and Vue 3 frontend.

## Features

- **AI-Powered Project Planning** — generate tasks, risks, timeline and Gantt chart via Google Gemini or OpenWebUI/Ollama; review and approve suggestions before they are applied
- **Gantt Chart Generation** — automatic SVG→PNG Gantt chart trimmed to actual task duration, exported and embedded in PDF reports
- **PDF Export** — full project analysis export (tasks, risks, timeline, Gantt chart) with Slovak diacritic support
- **AI Chat** — per-project AI assistant for follow-up questions
- **Microsoft Teams Integration** — SSO via Azure AD (MSAL), task sync to MS Planner, Teams channel creation
- **Project & Task Management** — create projects, assign tasks, track progress, manage team members and work teams
- **Real-time Notifications** — WebSocket-based in-app notifications
- **Role-Based Access Control** — Admin, Project Manager, Member roles with granular permissions
- **Multi-language UI** — English and Slovak (sk/en locale switching)
- **System Administration** — AI provider/model management, maintenance mode, system settings

## Technology Stack

### Backend
- Node.js v22+ with Express (ESM modules)
- PostgreSQL 15 via Sequelize ORM (Docker)
- JWT authentication + Microsoft MSAL SSO
- Google Gemini (`@google/generative-ai`) — primary AI provider
- OpenWebUI/Ollama — alternative local AI provider
- `sharp` — SVG to PNG conversion for Gantt charts
- `ws` — WebSocket server for real-time notifications
- Microsoft Graph API — Teams, Planner integration

### Frontend
- Vue 3 with Composition API
- Pinia for state management
- PrimeVue component library
- Vue Router
- Axios
- Vite 5
- `marked` — markdown rendering for AI timeline output
- `jsPDF` — client-side PDF generation

## Getting Started

### Prerequisites
- Node.js v18+
- Docker & Docker Compose (for PostgreSQL)
- Google Gemini API key **or** a running OpenWebUI/Ollama instance
- Microsoft Azure AD application (optional, for SSO + Teams integration)

### 1. Start the database

```bash
docker compose up -d
```

PostgreSQL runs on port **9800** (mapped to internal 5432).

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values
node server.js
```

Backend runs on **http://localhost:9801**

Key `.env` variables:

| Variable | Description |
|---|---|
| `PORT` | Backend port (default `9801`) |
| `DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing secret |
| `AI_SERVICE_PROVIDER` | `gemini` or `openwebui` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENWEBUI_API_URL` | OpenWebUI base URL |
| `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID` | Azure AD for SSO |
| `ENABLE_LOCAL_AUTH` | `true` to allow email/password login |

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:9801
VITE_API_URL=http://localhost:9801/api
```

```bash
npm run dev
```

Frontend runs on **http://localhost:5173**

## Project Structure

```
backend/
├── config/           # DB, AI provider, MSAL configs
├── controllers/      # Route handlers
├── middleware/       # Auth, roles, maintenance, error handling
├── migrations/       # Sequelize DB migrations
├── models/           # Sequelize models (User, Project, Task, …)
├── prompts/          # AI prompt templates (en/ sk/)
├── routes/           # Express routers
├── services/         # Business logic
│   ├── aiServiceFactory.js         # Selects Gemini or OpenWebUI
│   ├── geminiProjectService.js     # Gemini AI logic
│   ├── openwebuiProjectService.js  # OpenWebUI AI logic
│   ├── ganttChartGenerator.js      # SVG→PNG Gantt generation
│   ├── promptLoaderService.js      # Locale-aware prompt loading
│   ├── teamsIntegrationService.js  # MS Teams/Planner
│   └── websocketService.js         # Real-time notifications
└── server.js

frontend/src/
├── components/       # Reusable UI components (ProjectForm, TaskCard, …)
├── composables/      # useProjectPdfExport, useNotifications, …
├── locales/          # en.json, sk.json
├── router/           # Vue Router
├── services/         # API client (api.js)
├── stores/           # Pinia stores (project, task, auth, …)
├── utils/            # Helpers
└── views/
    ├── projects/     # ProjectsView, ProjectDetailView, AIProjectSuggestionsView
    ├── admin/        # System settings, user management
    └── …
```

## API Endpoints (summary)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/microsoft` | Azure AD SSO |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Project CRUD |
| POST | `/api/projects/:id/ai-suggestions` | Generate AI plan |
| POST | `/api/projects/:id/apply-ai-suggestions` | Apply approved suggestions |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/PUT/DELETE | `/api/tasks/:id` | Task CRUD |
| POST | `/api/ai/chat` | AI chat message |
| GET | `/api/ai/models` | List available AI models |
| GET/PUT | `/api/admin/settings` | System settings |
| GET/POST | `/api/work-teams` | Work team management |
| GET | `/api/notifications` | User notifications |

### Teams Integration
- POST /api/teams/channel/:projectId - Create Teams channel
- POST /api/teams/message/:projectId - Send message to channel
- POST /api/teams/task - Create Teams task
- POST /api/teams/sync-task/:taskId - Sync task with Teams

## Configuration

### Microsoft Azure AD Setup
1. Register application in Azure Portal
2. Add redirect URI: http://localhost:5000/api/auth/callback
3. Generate client secret
4. Configure API permissions for Microsoft Graph

### OpenAI Setup
1. Get API key from OpenAI platform
2. Add to environment variables
3. Configure model (gpt-4 recommended)

## Development

### Code Style
- Use clean, readable code with proper comments
- Follow ES6+ standards
- Use async/await for asynchronous operations
- Keep files modular and well-organized

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

### Backend Deployment
1. Build for production
2. Set environment variables
3. Deploy to hosting service (Heroku, AWS, Azure, etc.)

### Frontend Deployment
```bash
npm run build
```
Deploy the `dist` folder to static hosting (Netlify, Vercel, etc.)

## License

MIT License

## Support

For issues and questions, please create an issue in the repository.
