import { supabase } from '../supabase.js';

export const setupRLS = async () => {
  console.log('Setting up Row Level Security (RLS) policies...');
  
  // Create a function to set tenant context for RLS
  const { error: funcError } = await supabase.rpc('create_or_update_tenant_context_function');
  
  if (funcError) {
    console.error('Error creating tenant context function:', funcError);
    throw funcError;
  }

  // Enable RLS and create policies for each table
  const tables = ['appointments', 'users', 'contacts', 'settings'];
  
  for (const table of tables) {
    // Enable RLS on the table using the _enable_rls function
    const { error: rlsError } = await supabase.rpc('_enable_rls', { tbl: table });
    
    if (rlsError && !rlsError.message?.includes('already enabled')) {
      console.error(`Error enabling RLS on ${table}:`, rlsError);
      // Continue with other tables even if RLS enable fails
      continue;
    }

    // Create tenant isolation policy
    const createPolicySql = `
      CREATE POLICY IF NOT EXISTS ${table}_tenant_isolation 
      ON ${table}
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', {
      query: createPolicySql
    });

    if (policyError && !policyError.message.includes('already exists')) {
      console.error(`Error creating policy for ${table}:`, policyError);
      // Continue with other tables even if policy creation fails
      continue;
    }
  }

  console.log('RLS setup completed successfully');
};

// Add this to your database migration or initialization script
// await setupRLS();
