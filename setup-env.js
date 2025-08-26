import fs from 'fs';
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(process.cwd(), 'server', '.env');
const exampleEnvPath = path.join(process.cwd(), 'server', '.env.example');

// Check if .env file already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Would you like to overwrite it? (y/n)');
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
    startSetup();
  });
} else {
  startSetup();
}

function startSetup() {
  console.log('🚀 Setting up your environment...');
  console.log('Please provide the following details:');
  
  const envVars = {
    SUPABASE_URL: '',
    SUPABASE_SERVICE_KEY: '',
    PORT: '3001',
    NODE_ENV: 'development',
    ALLOWED_ORIGINS: '*',
    RAZORPAY_KEY_ID: '',
    RAZORPAY_KEY_SECRET: '',
    RAZORPAY_WEBHOOK_SECRET: 'your_webhook_secret',
    SUBS_GRACE_DAYS: '3'
  };

  const questions = [
    {
      name: 'SUPABASE_URL',
      question: 'Enter your Supabase URL (e.g., https://xxxxxxxxxxxxx.supabase.co): ',
      required: true,
      validate: (value) => {
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return 'URL must start with http:// or https://';
        }
        if (!value.includes('.supabase.co') && !value.includes('localhost')) {
          return 'URL should be a valid Supabase URL (e.g., https://xxxxxxxxxxxxx.supabase.co)';
        }
        return true;
      }
    },
    {
      name: 'SUPABASE_SERVICE_KEY',
      question: 'Enter your Supabase Service Role Key (starts with eyJ...): ',
      required: true,
      secret: true
    },
    {
      name: 'RAZORPAY_KEY_ID',
      question: 'Enter your Razorpay Key ID (optional, press Enter to skip): ',
      required: false
    },
    {
      name: 'RAZORPAY_KEY_SECRET',
      question: 'Enter your Razorpay Key Secret (optional, press Enter to skip): ',
      required: false,
      secret: true
    }
  ];

  let currentQuestion = 0;

  const askQuestion = () => {
    if (currentQuestion >= questions.length) {
      saveEnvFile(envVars);
      return;
    }

    const q = questions[currentQuestion];
    const prompt = q.question;

    rl.question(prompt, (answer) => {
      if (q.required && !answer.trim()) {
        console.log('❌ This field is required.');
        askQuestion(); // Ask the same question again
        return;
      }
      
      // Validate the answer if there's a validation function
      if (q.validate) {
        const validation = q.validate(answer.trim());
        if (validation !== true) {
          console.log(`❌ ${validation}`);
          askQuestion(); // Ask the same question again
          return;
        }
      }

      if (answer.trim()) {
        envVars[q.name] = answer.trim();
      }

      currentQuestion++;
      askQuestion();
    });
  };

  askQuestion();
}

function saveEnvFile(envVars) {
  let envContent = `# Environment Configuration
# Generated on ${new Date().toISOString()}

# Supabase Configuration
SUPABASE_URL=${envVars.SUPABASE_URL}
SUPABASE_SERVICE_KEY=${envVars.SUPABASE_SERVICE_KEY}

# Server Configuration
PORT=${envVars.PORT}
NODE_ENV=${envVars.NODE_ENV}
ALLOWED_ORIGINS=${envVars.ALLOWED_ORIGINS}

# Razorpay Configuration
RAZORPAY_KEY_ID=${envVars.RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${envVars.RAZORPAY_KEY_SECRET}
RAZORPAY_WEBHOOK_SECRET=${envVars.RAZORPAY_WEBHOOK_SECRET}
SUBS_GRACE_DAYS=${envVars.SUBS_GRACE_DAYS}
`;

  // Ensure server directory exists
  const serverDir = path.join(process.cwd(), 'server');
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Environment file created at: ${envPath}`);
  console.log('\n🔒 IMPORTANT: Add this file to your .gitignore to keep your credentials secure!');
  
  // Copy example file if it doesn't exist
  if (!fs.existsSync(exampleEnvPath)) {
    const exampleContent = `# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=*

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SUBS_GRACE_DAYS=3
`;
    fs.writeFileSync(exampleEnvPath, exampleContent);
    console.log(`📝 Example environment file created at: ${exampleEnvPath}`);
  }

  console.log('\n✨ Setup complete! You can now start the server.');
  console.log('Run: npm run dev\n');
  
  rl.close();
}
