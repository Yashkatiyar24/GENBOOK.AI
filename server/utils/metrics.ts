import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

let registered = false;

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

export function registerMetrics() {
  if (registered) return;
  registered = true;
  client.collectDefaultMetrics();
  client.register.registerMetric(httpRequestDuration);
}

export function metricsEndpoint(_req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics().then((m) => res.send(m));
}

export function observeRequestDuration(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const seconds = Number(end - start) / 1e9;
    const method = req.method;
    // Best-effort route path, fallback to URL
    const route = (req.route && req.route.path) || req.path || req.url || 'unknown';
    const status = String(res.statusCode);
    httpRequestDuration.labels(method, route, status).observe(seconds);
  });
  next();
}
