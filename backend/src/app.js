import express from 'express';
import path from 'path';
import fs from 'fs';
import { configureCors } from './config/cors.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import diaryRoutes from './routes/diaryRoutes.js';
import lessonPlanRoutes from './routes/lessonPlanRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import practicalRoutes from './routes/practicalRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import inspectionRoutes from './routes/inspectionRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import documentIntelligenceRoutes from './routes/documentIntelligenceRoutes.js';
import examRoutes from './routes/examRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { getDBStatus } from './config/db.js';
import { storage } from './config/storage.js';
import { standardLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security and utility middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(configureCors());
app.use(standardLimiter);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static file hosting for teacher classroom uploads & generated reports
const uploadsDir = path.resolve(process.cwd(), 'uploads');
const backendUploadsDir = path.resolve(process.cwd(), 'backend', 'uploads');
app.use('/uploads', express.static(uploadsDir));
if (fs.existsSync(backendUploadsDir)) {
  app.use('/uploads', express.static(backendUploadsDir));
}

// Health and DB diagnostic check
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'online',
    appName: 'AI Teacher Documentation Management Portal API',
    version: '7.0.0',
    phase: 'Production Ready (Phases 1-7)',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected,
      mode: dbStatus.mode || (dbStatus.isConnected ? 'mongodb_atlas' : 'persistent_local_store'),
    },
    storage: storage.getStorageStatus(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/lesson-plans', lessonPlanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/practicals', practicalRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inspection', inspectionRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/document-intelligence', documentIntelligenceRoutes);
app.use('/api/exams', examRoutes);

// Serve built frontend assets in production/unified deployment if present
const possibleDistPaths = [
  path.resolve(process.cwd(), 'frontend', 'dist'),
  path.resolve(process.cwd(), '..', 'frontend', 'dist'),
  path.resolve(process.cwd(), 'dist'),
];
const frontendDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  // Client-side React SPA fallback for Express 5 compatibility
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

// Catch-all 404 & centralized error handler
app.use(notFound);
app.use(errorHandler);

export default app;
