module.exports = {
  getCache: jest.fn().mockResolvedValue(null),
  cached: async (_key, _ttl, fn) => fn(),
};
