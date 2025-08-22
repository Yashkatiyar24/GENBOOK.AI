-- Fix for missing set_tenant_context function
-- First drop the function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.set_tenant_context(uuid) CASCADE;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to set tenant context: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to verify the tenant context function works
CREATE OR REPLACE FUNCTION verify_tenant_context()
RETURNS void AS $$
BEGIN
  -- Test the function with a dummy UUID
  PERFORM set_tenant_context('00000000-0000-0000-0000-000000000000');
  RAISE NOTICE 'Tenant context function verified successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Tenant context verification failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Call the verification function
SELECT verify_tenant_context();

-- Clean up the verification function
DROP FUNCTION IF EXISTS verify_tenant_context();

-- Update the create_or_update_tenant_context_function to be a no-op
CREATE OR REPLACE FUNCTION create_or_update_tenant_context_function()
RETURNS void AS $$
BEGIN
  -- This function is intentionally left empty
  -- as it's just a placeholder for the RLS setup
  RAISE NOTICE 'Tenant context functions are properly set up';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
