import { supabase } from '../supabase';

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
    // Enable RLS on the table
    const { error: rlsError } = await supabase.rpc('enable_rls', { table_name: table });
    
    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.error(`Error enabling RLS on ${table}:`, rlsError);
      throw rlsError;
    }

    // Create tenant isolation policy
    const { error: policyError } = await supabase.rpc('create_tenant_policy', {
      table_name: table,
      policy_name: `${table}_tenant_isolation`,
      using_condition: `tenant_id = current_setting('app.current_tenant_id')::uuid`
    });

    if (policyError && !policyError.message.includes('already exists')) {
      console.error(`Error creating policy for ${table}:`, policyError);
      throw policyError;
    }
  }

  console.log('RLS setup completed successfully');
};

// Add this to your database migration or initialization script
// await setupRLS();
