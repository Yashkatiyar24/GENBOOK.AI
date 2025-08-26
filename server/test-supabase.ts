import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? '*** (set)' : 'undefined');
    console.log('SUPABASE_SERVICE_KEY:', supabaseKey ? '*** (set)' : 'undefined');
    process.exit(1);
  }
  
  console.log('Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  try {
    console.log('Testing database connection...');
    const { data, error } = await supabase.from('appointments').select('*').limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    console.log('Sample data:', data);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing Supabase connection:', error);
    process.exit(1);
  }
}

testSupabase();
