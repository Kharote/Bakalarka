import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import teamsRoutes from './routes/teamsRoutes.js';
import workTeamRoutes from './routes/workTeamRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import testRoutes from './routes/testRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeWebSocket } from './services/websocketService.js';
import { checkMaintenanceMode } from './middleware/maintenanceMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting server...');

// Initialize Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

console.log('Express app created');

// Connect to database
connectDatabase();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers with cross-origin resource policy
app.use(morgan('dev')); // Logging
app.use(cookieParser()); // Parse cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory with CORS headers
app.use('/gantt-charts', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public', 'gantt-charts')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI Project Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Initialize WebSocket
const io = initializeWebSocket(server);

// Middleware to attach Socket.IO to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Maintenance mode check (after auth & admin routes so admins can still manage)
app.use(checkMaintenanceMode);

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/work-teams', workTeamRoutes);
app.use('/api/test', testRoutes);

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`WebSocket server initialized`);
  console.log(`=================================`);
});

export default app;
