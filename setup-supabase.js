const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🚀 Supabase Setup');
  console.log('----------------');
  
  // Get Supabase URL
  const supabaseUrl = await askQuestion('Enter your Supabase URL (e.g., https://xxxxxxxxxxxxx.supabase.co): ');
  const supabaseKey = await askQuestion('Enter your Supabase Service Role Key (starts with eyJ...): ');
  
  // Create .env content
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
  
  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

main().catch(console.error);
