module.exports = {
  registerMetrics: jest.fn(),
  metricsEndpoint: (_req, res) => res.send('# mock metrics')
  ,
  observeRequestDuration: (_req, _res, next) => next()
};
