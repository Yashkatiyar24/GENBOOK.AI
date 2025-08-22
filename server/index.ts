import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import logger from './utils/logger.js';
import { registerMetrics, metricsEndpoint, observeRequestDuration } from './utils/metrics.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { supabase } from './supabase.js';
// Import middleware and utilities using relative paths
import { tenantMiddleware, requireRole } from './middleware/tenant.middleware.js';
import { tenantDB } from './utils/tenant-db.js';
import { setupRLS } from './utils/rls-setup.js';
import { initializeDatabase } from './utils/db-init.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import * as Sentry from '@sentry/node';
import { startNotificationProcessor } from './utils/jobs/notification-processor.js';
// Basic error type for Express error handling

interface ErrorWithStatus extends Error {
  status?: number;
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
// CORS allowlist from env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow same-origin/no-origin (e.g., curl, mobile apps)
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));
// Security headers
app.use(helmet());

// Request ID + HTTP logging
app.use((req, _res, next) => {
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  (req as any).reqId = reqId;
  next();
});
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  }
}));
// Metrics observation for request durations
app.use(observeRequestDuration);

// Webhook endpoints must use raw body parser and be defined BEFORE express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Store raw body for signature verification
  (req as any).rawBody = req.body;
  next();
}, webhookRoutes);

// JSON parser for the rest of the routes
app.use(express.json({ limit: '10mb' }));

// Sentry (minimal init only)
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

// Attach Sentry request handler after security middleware and before routes
if (process.env.SENTRY_DSN) {
  // @ts-ignore - tolerate version differences
  const reqHandler = (Sentry as any).Handlers?.requestHandler?.();
  if (reqHandler) app.use(reqHandler);
  // Tag reqId on the active request scope
  app.use((req, _res, next) => {
    try {
      // @ts-ignore
      const scope = (Sentry as any).getCurrentHub?.().getScope?.();
      // @ts-ignore
      if (scope && (req as any)?.reqId) scope.setTag('reqId', (req as any).reqId);
      if (scope && req.headers['x-forwarded-for']) scope.setTag('xff', String(req.headers['x-forwarded-for']));
    } catch {}
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Prometheus metrics endpoint
registerMetrics();
app.get('/metrics', metricsEndpoint);

// Test error route
app.get('/test-error', (req: Request, res: Response) => {
  try {
    // This will throw an error
    throw new Error('This is a test error from the /test-error endpoint');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Test error triggered',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import routes using ES modules
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import teamRoutes from './routes/team.js';
import contactRoutes from './routes/contact.js';
import emailRoutes from './routes/email.js';
import tenantsRoutes from './routes/tenants.js';
import analyticsRoutes from './routes/analytics.js';
import integrationsRoutes from './routes/integrations.js';
import recurringRoutes from './routes/recurring.js';
import waitlistRoutes from './routes/waitlist.js';
import commRoutes from './routes/communications.js';
import notificationsRoutes from './routes/notifications.js';
import telehealthRoutes from './routes/telehealth.js';
import webhooksRoutes from './routes/webhooks.js';
import razorpayRoutes from './routes/razorpay.js';
// Billing (JSON routes)
app.use('/billing', billingRoutes);
// Razorpay routes
app.use('/api/razorpay', razorpayRoutes);

// Public routes (no tenant/auth required)
app.use('/auth', authRoutes);
// Public email routes (no tenant required)
app.use('/api/email', emailRoutes);
// Rate limit only the contact route (5 req/min/IP)
const contactLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false });
app.use('/api/contact', contactLimiter, contactRoutes);

// Public webhooks (no tenant middleware)
app.use('/webhooks', webhooksRoutes);

// Apply tenant middleware to all other routes
app.use(tenantMiddleware);
app.use(tenantDB);

// API v1 router (versioned)
const v1 = express.Router();
v1.use('/tenants', tenantsRoutes);
v1.use('/appointments', appointmentRoutes);
v1.use('/team', teamRoutes);
v1.use('/analytics', analyticsRoutes);
v1.use('/integrations', integrationsRoutes);
v1.use('/recurring', recurringRoutes);
v1.use('/waitlist', waitlistRoutes);
v1.use('/comm', commRoutes);
v1.use('/notifications', notificationsRoutes);
v1.use('/telehealth', telehealthRoutes);
v1.use('/payments/razorpay', razorpayRoutes);
app.use('/api/v1', v1);

// Legacy mounts (compat) with deprecation logs — remove after clients migrate
app.use('/api/tenants', (req, _res, next) => { logger.warn('Using deprecated /api path, switch to /api/v1'); next(); }, tenantsRoutes);
app.use('/api/appointments', (req, _res, next) => { logger.warn('Using deprecated /api path, switch to /api/v1'); next(); }, appointmentRoutes);
app.use('/api/team', (req, _res, next) => { logger.warn('Using deprecated /api path, switch to /api/v1'); next(); }, teamRoutes);
app.use('/api/analytics', (req, _res, next) => { logger.warn('Using deprecated /api path, switch to /api/v1'); next(); }, analyticsRoutes);
app.use('/api/integrations', (req, _res, next) => { logger.warn('Using deprecated /api path, switch to /api/v1'); next(); }, integrationsRoutes);

// Error handling middleware
// Sentry error handler should come before our own error formatter
if (process.env.SENTRY_DSN) {
  // @ts-ignore
  const errHandler = (Sentry as any).Handlers?.errorHandler?.();
  if (errHandler) app.use(errHandler);
}
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERR ${(req as any)?.reqId || '-'}]`, err);
  const error = err as ErrorWithStatus;
  const status = error.status || 500;
  const message = error.message || 'An unknown error occurred';

  // Log error to console
  console.error('Error:', err);

  res.status(status).json({
    error: 'Internal server error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    await setupRLS();

    const server = createServer(app);

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      // Start background processors
      startNotificationProcessor();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server unless running in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;