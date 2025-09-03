import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createExecFunction() {
  try {
    console.log('Creating exec_sql function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text) 
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
        RETURN jsonb_build_object('success', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', SQLERRM,
          'sqlstate', SQLSTATE
        );
      END;
      $$;
    `;
    
    // Use the postgres role to create the function
    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
    
    if (error) {
      console.error('Error creating exec_sql function:', error);
      return;
    }
    
    console.log('Successfully created exec_sql function');
    
    // Test the function
    const testResult = await supabase.rpc('exec_sql', { 
      sql: "SELECT 'Test query executed successfully' as message;" 
    });
    
    console.log('Test query result:', testResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the function creation
createExecFunction().catch(console.error);
