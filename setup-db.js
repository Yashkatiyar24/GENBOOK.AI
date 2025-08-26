import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Initialize readline interface
const rl = readline.createInterface({ input, output });

async function main() {
  try {
    console.log('🚀 Supabase Database Setup');
    console.log('-------------------------');
    
    // Ask for Supabase credentials
    const supabaseUrl = await rl.question('Enter your Supabase URL (e.g., https://xxxxxxxxxxxxx.supabase.co): ');
    const supabaseKey = await rl.question('Enter your Supabase Service Role Key (starts with eyJ...): ');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test the connection
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase.from('appointments').select('*').limit(1);
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to the database!');
    
    // Create .env file
    const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_KEY=${supabaseKey}

# Server Configuration
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=*

# Razorpay Configuration (optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SUBS_GRACE_DAYS=3
`;

    // Ensure server directory exists
    const serverDir = path.join(process.cwd(), 'server');
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    
    // Write .env file
    const envPath = path.join(serverDir, '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n✅ Created environment file at: ${envPath}`);
    console.log('\n✨ Setup complete! You can now start the server with:');
    console.log('   npm run dev\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nPlease check your Supabase URL and Service Role Key and try again.');
    console.log('You can find these in your Supabase project settings -> API');
  } finally {
    rl.close();
  }
}

main();
