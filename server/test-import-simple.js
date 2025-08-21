// Test file to verify JavaScript module resolution
import { hello } from './test-simple.js';

console.log('Simple import test started');
console.log('Result from simple module:', hello('Test User'));
