import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or anonymous key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    // Try to list all tables in the public schema
    const { data, error } = await supabase.rpc('get_all_tables');
    
    if (error) throw error;
    
    console.log('Tables in public schema:', data);
    
    // If no tables found, try to run migrations
    if (!data || data.length === 0) {
      console.log('No tables found. Running migrations...');
      await runMigrations();
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
    
    // If the function doesn't exist, try to create it
    if (error.message.includes('function get_all_tables() does not exist')) {
      console.log('Creating get_all_tables function...');
      await createGetAllTablesFunction();
      await checkTables();
    }
  }
}

async function createGetAllTablesFunction() {
  const { error } = await supabase.rpc('create_get_all_tables_function');
  if (error) {
    console.error('Error creating function:', error);
    throw error;
  }
  console.log('Created get_all_tables function');
}

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Execute each migration file
    const migrationFiles = [
      '0000_create_exec_sql_function.sql',
      '20230813_add_tenant_rbac.sql',
      '2025-08-14-fix-doctor-names.sql',
      '2025-08-15-billing-and-usage.sql',
      '2025-08-15-contact-messages.sql',
      '2025-08-15-rls-policies.sql',
      '2025-08-15-rls-verify.sql',
      '2025-08-15-user-id-triggers.sql',
      '2025-08-18-indexes.sql',
      '2025-08-18-phase1.sql',
      '2025-08-20-communications.sql',
      '2025-08-20-razorpay-billing.sql',
      '2025-08-21-insert-razorpay-plans.sql',
      '2025-08-21-razorpay-subscriptions.sql',
      '2025-08-21-update-billing-for-razorpay.sql',
      '2025-08-add-organization.sql',
      '20250903_create_subscription_plans.sql',
      '20250903_fix_auth_setup.sql',
      'fix_tenant_context.sql'
    ];
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = await import('fs').then(fs => 
        fs.readFileSync(`./migrations/${file}`, 'utf8')
      );
      
      const { error } = await supabase.rpc('exec', { sql });
      if (error) {
        console.error(`Error running migration ${file}:`, error);
      } else {
        console.log(`Successfully ran migration: ${file}`);
      }
    }
    
    console.log('All migrations completed');
    
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

// Execute the check
checkTables().catch(console.error);
