import fs from 'fs';
import path from 'path';
import readline from 'readline';

export function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  });
  
  return envVars;
}

export function formatEnvVars(envVars) {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function fixSupabaseUrl(url) {
  if (!url) return 'https://your-project-ref.supabase.co';
  
  // Ensure it has a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Ensure it ends with .supabase.co
  if (!url.includes('.supabase.co') && !url.includes('localhost')) {
    // Remove any path or query parameters
    const cleanUrl = url.split(/[?#]/)[0];
    // Remove trailing slashes
    url = cleanUrl.replace(/\/+$/, '') + '.supabase.co';
  }
  
  return url;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const envPath = path.join(process.cwd(), 'server', '.env');
  const backupPath = `${envPath}.bak`;
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.error(`Error: ${envPath} not found`);
    process.exit(1);
  }
  
  // Create a backup
  fs.copyFileSync(envPath, backupPath);
  console.log(`Created backup at: ${backupPath}`);
  
  // Parse the current .env file
  const envVars = parseEnvFile(envPath);
  
  // Fix the Supabase URL
  const currentUrl = envVars.SUPABASE_URL || '';
  const fixedUrl = fixSupabaseUrl(currentUrl);
  
  // Ask for confirmation
  if (currentUrl !== fixedUrl) {
    console.log(`\nCurrent SUPABASE_URL: ${currentUrl || '(not set)'}`);
    console.log(`Fixed SUPABASE_URL:  ${fixedUrl}`);
    
    const answer = await new Promise(resolve => {
      rl.question('\nDo you want to update the SUPABASE_URL? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() === 'y') {
      envVars.SUPABASE_URL = fixedUrl;
      console.log('✅ SUPABASE_URL updated');
    }
  }
  
  // Verify the service key
  if (!envVars.SUPABASE_SERVICE_KEY) {
    console.log('\n❌ SUPABASE_SERVICE_KEY is not set');
  } else if (!envVars.SUPABASE_SERVICE_KEY.startsWith('ey')) {
    console.log('\n⚠️  SUPABASE_SERVICE_KEY does not start with "ey". This might be invalid.');
  } else {
    console.log('\n✅ SUPABASE_SERVICE_KEY looks valid');
  }
  
  // Write the updated .env file
  fs.writeFileSync(envPath, formatEnvVars(envVars));
  console.log(`\n✅ Updated ${envPath}`);
  
  rl.close();
}

main().catch(console.error);
