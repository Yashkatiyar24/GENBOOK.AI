// Test file to verify module resolution
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);

// Try to import tenant.middleware using different paths
const pathsToTry = [
  '../src/middleware/tenant.middleware',
  '../src/middleware/tenant.middleware.ts',
  '/Users/yashkatiyar/Downloads/GENBOOK.AI-main/src/middleware/tenant.middleware',
  '/Users/yashkatiyar/Downloads/GENBOOK.AI-main/src/middleware/tenant.middleware.ts'
];

async function testImports() {
  for (const path of pathsToTry) {
    try {
      console.log(`\nTrying to import: ${path}`);
      const module = await import(path);
      console.log('✅ Successfully imported:', Object.keys(module));
      return;
    } catch (error) {
      console.error(`❌ Failed to import ${path}:`, error.message);
    }
  }
  
  console.log('\nAll import attempts failed. Checking file existence...');
  
  // Check if file exists using fs
  const fs = await import('fs');
  const fullPath = resolve(__dirname, '../src/middleware/tenant.middleware.ts');
  try {
    const exists = fs.existsSync(fullPath);
    console.log(`File exists at ${fullPath}:`, exists);
    if (exists) {
      const stats = fs.statSync(fullPath);
      console.log('File stats:', stats);
      console.log('File content (first 200 chars):', 
        fs.readFileSync(fullPath, 'utf-8').substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error checking file:', error);
  }
}

testImports().catch(console.error);
