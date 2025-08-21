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
  console.log('SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Check if users table exists
    const { data: usersTable, error: usersError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'users');
    
    if (usersError) throw usersError;
    
    if (!usersTable || usersTable.length === 0) {
      console.log('Users table does not exist');
      // List all tables
      const { data: allTables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (tablesError) throw tablesError;
      
      console.log('Available tables:', allTables.map(t => t.tablename).join(', '));
      return;
    }
    
    // Get users table columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
      
    if (columnsError) throw columnsError;
    
    console.log('Users table columns:');
    console.table(columns);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
