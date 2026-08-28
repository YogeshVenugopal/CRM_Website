import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { apiLimiter } from './core/middleware/rateLimiter.js';
import errorHandler from './core/middleware/errorHandler.js';
import AppError from './core/utils/AppError.js';
import logger from './core/utils/logger.js';

// Routes
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import leadRoutes from './modules/leads/lead.routes.js';
import activityRoutes from './modules/activities/activity.routes.js';
import opportunityRoutes from './modules/pipeline/opportunity.routes.js';
import clientRoutes from './modules/clients/client.routes.js';
import quotationRoutes from './modules/quotations/quotation.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import reportRoutes from './modules/reports/report.routes.js';

const app = express();
app.set('trust proxy', 1);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true, // Allow cookies
  }),
);

// ─── Body Parsing & Cookies ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ─── Rate Limiting (skip in test) ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(apiLimiter);
}

// ─── API Versioning ──────────────────────────────────────────────────────────
const apiV1 = '/api/v1';

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(`${apiV1}/health`, healthRoutes);
app.use(`${apiV1}/auth`, authRoutes);
app.use(`${apiV1}/users`, userRoutes);
app.use(`${apiV1}/leads`, leadRoutes);
app.use(`${apiV1}/activities`, activityRoutes);
app.use(`${apiV1}/opportunities`, opportunityRoutes);
app.use(`${apiV1}/clients`, clientRoutes);
app.use(`${apiV1}/quotations`, quotationRoutes);
app.use(`${apiV1}/projects`, projectRoutes);
app.use(`${apiV1}/tasks`, taskRoutes);
app.use(`${apiV1}/invoices`, financeRoutes);
app.use(`${apiV1}/notifications`, notificationRoutes);
app.use(`${apiV1}/reports`, reportRoutes);

// ─── Root Health (non-versioned for load balancers) ──────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all('/{*splat}', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
