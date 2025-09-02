import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Configure dotenv to load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupAuthDatabase() {
  // Get Supabase URL and service role key from environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing required environment variables');
    console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
  }

  // Create a Supabase client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('Setting up authentication database...');

    // Enable required extensions
    await supabase.rpc('create_extension', { extname: 'uuid-ossp' });
    await supabase.rpc('create_extension', { extname: 'pgcrypto' });
    console.log('✅ Enabled required database extensions');

    // Create profiles table if it doesn't exist
    const { error: tableError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
          full_name TEXT,
          organization_name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });

    if (tableError) throw tableError;
    console.log('✅ Created/verified profiles table');

    // Enable RLS on profiles table
    await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;',
    });

    // Create RLS policies
    const { error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        -- Public profiles are viewable by everyone
        DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
        CREATE POLICY "Public profiles are viewable by everyone" 
          ON public.profiles FOR SELECT 
          USING (true);

        -- Users can insert their own profile
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        CREATE POLICY "Users can insert their own profile" 
          ON public.profiles FOR INSERT 
          WITH CHECK (auth.uid() = id);

        -- Users can update own profile
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" 
          ON public.profiles FOR UPDATE 
          USING (auth.uid() = id);
      `,
    });

    if (policiesError) throw policiesError;
    console.log('✅ Configured RLS policies');

    // Create or replace the handle_new_user function
    const { error: functionError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION public.handle_new_user() 
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, organization_name)
          VALUES (
            NEW.id, 
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'organization_name'
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    });

    if (functionError) throw functionError;
    console.log('✅ Created/updated handle_new_user function');

    console.log('⚠️  Note: The trigger needs to be created manually in the Supabase SQL editor');
    console.log('Please run this SQL in your Supabase SQL editor:');
    console.log(`
-- Run this in Supabase SQL Editor with service role key permissions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

    console.log('\n✨ Authentication database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up authentication database:');
    console.error(error);
    process.exit(1);
  }
}

// Run the setup
setupAuthDatabase();
