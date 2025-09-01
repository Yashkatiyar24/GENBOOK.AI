import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env file');
    console.log('Please make sure you have set up the .env file with:');
    console.log('SUPABASE_URL=your-supabase-url');
    console.log('SUPABASE_SERVICE_KEY=your-service-role-key');
    return;
  }
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Key:', supabaseKey.substring(0, 10) + '...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    console.log('\n🔌 Connecting to Supabase...');
    
    // Test a simple query
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to the database!');
    console.log('\n📊 Sample data from appointments table:');
    console.log(data);
    
  } catch (error) {
    console.error('❌ Error connecting to the database:');
    console.error(error.message);
    
    if (error.message.includes('JWT')) {
      console.log('\n⚠️  The provided JWT is invalid or has expired.');
      console.log('Please check your SUPABASE_SERVICE_KEY in the .env file.');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('\n⚠️  Could not resolve the Supabase URL.');
      console.log('Please check your SUPABASE_URL in the .env file.');
    }
  }
}

testConnection();
