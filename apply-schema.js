import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

async function executeSql(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('SQL Error:', error.message);
    return { success: false, error };
  }
}

async function applySchema() {
  try {
    console.log('Starting schema application...');
    
    // 1. Create exec_sql function if it doesn't exist
    const createExecSqlFn = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error executing SQL: %. %', SQLERRM, query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('Creating exec_sql function...');
    await executeSql(createExecSqlFn);
    
    // 2. Apply tenant context function
    const tenantContextFn = `
      CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
      RETURNS VOID AS $$
      BEGIN
        PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to set tenant context: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('Creating set_tenant_context function...');
    await executeSql(tenantContextFn);
    
    // 3. Apply RLS helper function
    const enableRlsFn = `
      CREATE OR REPLACE FUNCTION public._enable_rls(tbl regclass) 
      RETURNS void LANGUAGE plpgsql AS $$
      BEGIN
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'enable rls failed on %: %', tbl, SQLERRM;
      END; $$;
    `;
    
    console.log('Creating _enable_rls function...');
    await executeSql(enableRlsFn);
    
    // 4. Apply RLS policies
    const rlsPolicies = fs.readFileSync('./migrations/2025-08-15-rls-policies.sql', 'utf8');
    console.log('Applying RLS policies...');
    await executeSql(rlsPolicies);
    
    console.log('Schema applied successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Failed to apply schema:', error);
    process.exit(1);
  }
}

applySchema();
