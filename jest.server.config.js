// jest.config.ts
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/server"],
  collectCoverage: true,
  coverageDirectory: 'coverage/server',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 65,
      statements: 65,
      branches: 50,
      functions: 60
    }
  },
  testMatch: [
    "<rootDir>/server/**/__tests__/**/*.[tj]s?(x)",
    "<rootDir>/server/**/?(*.)+(spec|test).[tj]s?(x)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.json"
      }
    ]
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^\\./swagger\\.js$": "<rootDir>/server/__mocks__/swagger.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^\\./supabase\\.js$": "<rootDir>/server/__mocks__/supabase.js",
    "^\\.\\./supabase\\.js$": "<rootDir>/server/__mocks__/supabase.js",
    "^\\./utils/db-init\\.js$": "<rootDir>/server/__mocks__/db-init.js",
    "^\\./utils/rls-setup\\.js$": "<rootDir>/server/__mocks__/rls-setup.js",
    "^\\./utils/tenant-db\\.js$": "<rootDir>/server/__mocks__/tenant-db.js",
    "^\\./routes/billing\\.js$": "<rootDir>/server/__mocks__/billing-routes.js",
    "^\\./routes/.+\\.js$": "<rootDir>/server/__mocks__/noop-route.js",
    "^\\./utils/logger\\.js$": "<rootDir>/server/__mocks__/logger.js",
    "^\\./utils/metrics\\.js$": "<rootDir>/server/__mocks__/metrics.js",
    "^\\./utils/cache\\.js$": "<rootDir>/server/__mocks__/cache.js",
    "^morgan$": "<rootDir>/server/__mocks__/morgan.js"
  }
};
