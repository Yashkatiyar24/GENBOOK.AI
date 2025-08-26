-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to execute SQL statements safely
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing SQL: %. %', SQLERRM, query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to set tenant context: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update the tenant context function for RLS
CREATE OR REPLACE FUNCTION create_or_update_tenant_context_function()
RETURNS void AS $$
BEGIN
  -- This function is called by the RLS setup to ensure the tenant context function exists
  -- It's a no-op if the function already exists with the correct definition
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_tenant_context' 
    AND pronargs = 1 
    AND proargtypes::text = '23' -- OID for uuid
  ) THEN
    RAISE EXCEPTION 'Required function set_tenant_context(uuid) does not exist';
  END IF;
  
  -- This function is a placeholder that's called by the RLS setup
  -- The actual work is done by set_tenant_context
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_or_update_tenant_context_function' 
    AND pronargs = 0
  ) THEN
    -- This is just a placeholder function that does nothing
    -- The actual setup is done by the RLS setup script
    CREATE OR REPLACE FUNCTION create_or_update_tenant_context_function()
    RETURNS void AS $$
    BEGIN
      -- This function is intentionally left empty
      -- It's just a placeholder for the RLS setup
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to enable RLS on a table
CREATE OR REPLACE FUNCTION enable_rls(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error enabling RLS on %: %', table_name, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to create tenant isolation policy
CREATE OR REPLACE FUNCTION create_tenant_policy(
  table_name text,
  policy_name text,
  using_condition text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = table_name 
    AND policyname = policy_name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (%s)',
      policy_name,
      table_name,
      using_condition
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating policy % on %: %', policy_name, table_name, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- Add tenant_id to appointments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'appointments' AND column_name = 'tenant_id') THEN
    ALTER TABLE appointments 
    ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    
    -- Backfill existing records with a default tenant (you'll need to update this)
    -- UPDATE appointments SET tenant_id = 'your-default-tenant-uuid';
    
    -- Add constraint after backfilling
    -- ALTER TABLE appointments ALTER COLUMN tenant_id DROP DEFAULT;
  END IF;
END $$;

-- Add tenant_id to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    ALTER TABLE users 
    ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'Staff';
    
    -- Backfill existing records with a default tenant
    -- UPDATE users SET tenant_id = 'your-default-tenant-uuid';
    -- ALTER TABLE users ALTER COLUMN tenant_id DROP DEFAULT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_created ON appointments(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);

-- Create default tenant if not exists
INSERT INTO tenants (id, name, created_at)
SELECT '00000000-0000-0000-0000-000000000000', 'Default Tenant', NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000');

-- Create admin user if not exists (change password after creation)
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001', 
  'admin@example.com', 
  crypt('admin123', gen_salt('bf')), 
  NOW(), 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001');

-- Create user profile for admin
INSERT INTO users (id, email, tenant_id, role, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  '00000000-0000-0000-0000-000000000000',
  'Admin',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000001');

-- Create a function to create a new tenant with an admin user
CREATE OR REPLACE FUNCTION create_tenant_with_admin(
  tenant_name text,
  admin_email text,
  admin_password text
) RETURNS uuid AS $$
DECLARE
  new_tenant_id uuid;
  new_user_id uuid;
BEGIN
  -- Create tenant
  INSERT INTO tenants (name) VALUES (tenant_name) RETURNING id INTO new_tenant_id;
  
  -- Create auth user
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
  VALUES (
    new_user_id,
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    NOW()
  );
  
  -- Create user profile with admin role
  INSERT INTO users (id, email, tenant_id, role, created_at)
  VALUES (
    new_user_id,
    admin_email,
    new_tenant_id,
    'Admin',
    NOW()
  );
  
  RETURN new_tenant_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create tenant and admin: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
