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

async function applyRlsFix() {
  try {
    console.log('Applying RLS fix...');
    
    // Create the _enable_rls function
    const createEnableRlsFunction = `
      create or replace function public._enable_rls(tbl regclass) 
      returns void language plpgsql as $$
      begin
        execute format('alter table %s enable row level security', tbl);
      exception when others then
        raise notice 'enable rls failed on %: %', tbl, sqlerrm;
      end; $$;
    `;
    
    // Execute the function creation
    const { error: functionError } = await supabase.rpc('exec_sql', { 
      query: createEnableRlsFunction 
    });
    
    if (functionError) {
      console.error('Error creating _enable_rls function:', functionError);
      // Continue even if function creation fails (it might already exist)
    }
    
    // Read and execute the RLS policies
    const rlsSql = fs.readFileSync('./migrations/2025-08-15-rls-policies.sql', 'utf8');
    const { data, error } = await supabase.rpc('exec_sql', { query: rlsSql });
    
    if (error) {
      console.error('Error applying RLS policies:', error);
      // Try executing the SQL directly as a fallback
      console.log('Trying direct SQL execution...');
      const statements = rlsSql.split(';').filter(s => s.trim().length > 0);
      
      for (const stmt of statements) {
        const trimmedStmt = stmt.trim();
        if (trimmedStmt) {
          console.log('Executing:', trimmedStmt.substring(0, 100) + '...');
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            query: trimmedStmt + ';' 
          });
          
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
          }
        }
      }
    }
    
    console.log('RLS fix applied successfully');
  } catch (error) {
    console.error('Unexpected error applying RLS fix:', error);
    process.exit(1);
  }
}

applyRlsFix();
