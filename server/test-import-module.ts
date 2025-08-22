// Test file to verify TypeScript module resolution
import { hello } from './test-module';

console.log('Import test started');
console.log('Result from test module:', hello('Test User'));
