import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Service Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    // Read the SQL fix file
    const sql = fs.readFileSync('./migrations/fix_tenant_context.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.error('Error applying fix:', error);
      // Try executing the SQL directly as a fallback
      console.log('Trying direct SQL execution...');
      const { data: directData, error: directError } = await supabase.rpc('exec_sql', { query: sql });
      
      if (directError) {
        console.error('Direct SQL execution failed:', directError);
        process.exit(1);
      }
      
      console.log('Fix applied successfully via direct SQL execution');
      return;
    }
    
    console.log('Fix applied successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

applyFix();
