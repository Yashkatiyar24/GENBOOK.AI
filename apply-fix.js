import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFix() {
  try {
    console.log('🚀 Applying database fix...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', 'fix_tenant_context.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`\n🔧 Executing statement ${index + 1}/${statements.length}...`);
        const { data, error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          console.warn(`⚠️  Warning on statement ${index + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${index + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`⚠️  Error executing statement ${index + 1}:`, err.message);
      }
    }
    
    // Verify the function exists and works
    console.log('\n🔍 Verifying tenant context function...');
    try {
      const { data, error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: '00000000-0000-0000-0000-000000000000' 
      });
      
      if (error) throw error;
      console.log('✅ Tenant context function verified successfully!');
    } catch (err) {
      console.error('❌ Failed to verify tenant context function:', err.message);
      throw err;
    }
    
    console.log('\n✨ Database fix applied successfully!');
    console.log('You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error applying database fix:', error.message);
    process.exit(1);
  }
}

applyFix();
