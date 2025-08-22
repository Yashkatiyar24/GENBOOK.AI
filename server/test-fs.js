import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);

// Check if the file exists
const targetFile = resolve(__dirname, '../src/middleware/tenant.middleware.ts');
console.log('Checking file:', targetFile);

try {
  const exists = fs.existsSync(targetFile);
  console.log('File exists:', exists);
  
  if (exists) {
    const stats = fs.statSync(targetFile);
    console.log('File stats:', {
      isFile: stats.isFile(),
      size: stats.size,
      modified: stats.mtime
    });
    
    // Try to read the file
    const content = fs.readFileSync(targetFile, 'utf-8');
    console.log('First 200 chars of file:', content.substring(0, 200) + '...');
  }
} catch (error) {
  console.error('Error:', error);
}
