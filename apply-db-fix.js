import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function applyFix() {
  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the fix SQL file
    const fixSqlPath = path.join(process.cwd(), 'migrations', 'fix_tenant_context.sql');
    const sql = fs.readFileSync(fixSqlPath, 'utf8');

    console.log('Applying database fix...');
    
    // Execute the SQL in a transaction
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) throw error;
    
    console.log('✅ Database fix applied successfully!');
    
    // Verify the function exists
    const { data: funcCheck, error: funcError } = await supabase
      .rpc('set_tenant_context', { tenant_id: '00000000-0000-0000-0000-000000000000' });
      
    if (funcError) {
      console.warn('⚠️ Function verification failed:', funcError.message);
    } else {
      console.log('✅ Tenant context function verified and working!');
    }
    
  } catch (error) {
    console.error('❌ Error applying database fix:', error.message);
    process.exit(1);
  }
}

applyFix();
