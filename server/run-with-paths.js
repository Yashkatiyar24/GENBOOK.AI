// Register tsconfig-paths to handle TypeScript path aliases
require('tsconfig-paths/register');

// Import the TypeScript file
require('ts-node').register({
  transpileOnly: true,
  project: './server/tsconfig.json',
  esm: true
});

// Import and run the main server file
import('./index.js').catch(console.error);
