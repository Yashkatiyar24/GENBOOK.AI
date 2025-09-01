// Simple test script to verify Supabase connection
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key:', supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'Not found');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection by listing tables
async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // List all tables in the public schema
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) throw error;
    
    console.log('\nTables in database:');
    console.table(tables);
    
  } catch (error) {
    console.error('Error connecting to Supabase:');
    console.error(error);
  }
}

testConnection();
