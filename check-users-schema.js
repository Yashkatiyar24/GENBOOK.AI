import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), 'server', '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  try {
    // Check if users table exists
    const { data: tableExists, error: tableError } = await supabase
      .rpc('table_exists', { table_name: 'users' });
    
    if (tableError) throw tableError;
    
    if (!tableExists) {
      console.log('Users table does not exist');
      return;
    }
    
    // Get table columns
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
      
    if (columnsError) throw columnsError;
    
    console.log('Users table columns:', columns);
    
  } catch (error) {
    console.error('Error checking users table:', error);
  }
}

checkUsersTable();
