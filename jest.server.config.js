export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: [
    '<rootDir>/server/**/__tests__/**/*.[tj]s?(x)',
    '<rootDir>/server/**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          types: ['jest', 'node'],
          typeRoots: ['<rootDir>/server/types', '<rootDir>/node_modules/@types']
        }
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // allow absolute imports from src if needed
    '^@/(.*)$': '<rootDir>/src/$1',
    // mock server swagger spec to avoid ESM import issues in tests
    '^\.\/swagger\.js$': '<rootDir>/server/__mocks__/swagger.js',
    // allow TS sources to satisfy ESM-style .js import specifiers
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // mock server supabase client to avoid ESM parsing and network calls
    '^\.\/supabase\.js$': '<rootDir>/server/__mocks__/supabase.js',
    '^\.\.\/supabase\.js$': '<rootDir>/server/__mocks__/supabase.js'
    ,
    // mock db-init and rls setup utilities to avoid import.meta usage
    '^\.\/utils\/db-init\.js$': '<rootDir>/server/__mocks__/db-init.js',
    '^\.\/utils\/rls-setup\.js$': '<rootDir>/server/__mocks__/rls-setup.js',
    '^\.\/utils\/tenant-db\.js$': '<rootDir>/server/__mocks__/tenant-db.js'
    ,
    // mock ESM route files to simple Routers
    '^\.\/routes\/billing\.js$': '<rootDir>/server/__mocks__/billing-routes.js',
    '^\.\/routes\/.+\.js$': '<rootDir>/server/__mocks__/noop-route.js'
    ,
    // mock new utils used by server index
    '^\.\/utils\/logger\.js$': '<rootDir>/server/__mocks__/logger.js',
    '^\.\/utils\/metrics\.js$': '<rootDir>/server/__mocks__/metrics.js',
    '^\.\/utils\/cache\.js$': '<rootDir>/server/__mocks__/cache.js',
    '^morgan$': '<rootDir>/server/__mocks__/morgan.js'
  }
};
