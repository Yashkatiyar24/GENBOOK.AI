const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
  log: jest.fn(),
};
module.exports = logger;
