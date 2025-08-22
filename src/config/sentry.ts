import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express, RequestHandler, ErrorRequestHandler } from 'express';

// Create a type for our Sentry middleware
type SentryMiddleware = {
  requestHandler: RequestHandler;
  errorHandler: ErrorRequestHandler;
};

// Initialize Sentry with default options
export function initSentry(app?: Express): typeof Sentry | null {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  const ENVIRONMENT = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking will be disabled.');
    return null;
  }

  // Configure Sentry with the latest API
  const sentryOptions: Sentry.NodeOptions = {
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `genbook-ai@${process.env.npm_package_version || '1.0.0'}`,
    // Enable performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.5 : 1.0,
    // Enable profiling
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    // Configure default integrations
    defaultIntegrations: false,
    // Add custom integrations
    integrations: [
      // Re-add default integrations we want to keep
      new Sentry.Integrations.InboundFilters(),
      new Sentry.Integrations.FunctionToString(),
      new Sentry.Integrations.LinkedErrors(),
      // Add HTTP and Express integrations
      new Sentry.Integrations.Http({ tracing: true }),
      nodeProfilingIntegration(),
      ...(app ? [new Sentry.Integrations.Express({ app })] : []),
    ],
  };

  try {
    // Initialize Sentry
    Sentry.init(sentryOptions);
    console.log(`Sentry initialized in ${ENVIRONMENT} environment`);
    return Sentry;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return null;
  }
}

// Create Sentry middleware handlers
export const sentryMiddleware: SentryMiddleware = {
  // Request handler creates a separate execution context using domains
  requestHandler: Sentry.Handlers.requestHandler(),
  // Error handler must be before any other error middleware and after all controllers
  errorHandler: Sentry.Handlers.errorHandler(),
};

export { Sentry };
