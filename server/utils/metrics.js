export function registerMetrics() {
  // no-op placeholder for Prometheus registry
}

export function metricsEndpoint(_req, res) {
  res.type('text/plain').send('# metrics placeholder');
}

export function observeRequestDuration(_req, _res, next) {
  // simple passthrough
  next();
}
