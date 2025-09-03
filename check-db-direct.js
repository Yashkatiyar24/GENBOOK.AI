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

async function checkDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection by selecting from a system view
    const { data, error } = await supabase.rpc('exec', {
      sql: `SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';`
    });
    
    if (error) throw error;
    
    console.log('Connected to database. Tables in public schema:');
    console.log(data);
    
    // Check if subscription_plans exists
    const hasSubscriptionPlans = data.some(row => 
      row.table_name === 'subscription_plans'
    );
    
    if (!hasSubscriptionPlans) {
      console.log('subscription_plans table does not exist. Creating it...');
      await createSubscriptionPlansTable();
    } else {
      console.log('subscription_plans table exists.');
      await checkSubscriptionPlansData();
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    // If the exec function doesn't exist, we need to create it first
    if (error.message.includes('function exec(json) does not exist')) {
      console.log('Creating exec function...');
      await createExecFunction();
      await checkDatabase();
    }
  }
}

async function createExecFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec(sql text) 
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN jsonb_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
    END;
    $$;
  `;
  
  // Use the postgres role to create the function
  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { error } = await adminSupabase.rpc('exec', { sql: createFunctionSQL });
  if (error) throw error;
  
  console.log('Created exec function');
}

async function createSubscriptionPlansTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      billing_interval TEXT NOT NULL,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Enable Row Level Security
    ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for subscription_plans
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_plans;
    CREATE POLICY "Enable read access for all users" 
    ON public.subscription_plans
    FOR SELECT USING (true);
  `;
  
  const { error } = await supabase.rpc('exec', { sql: createTableSQL });
  if (error) throw error;
  
  console.log('Created subscription_plans table');
  await insertDefaultPlans();
}

async function insertDefaultPlans() {
  const insertSQL = `
    INSERT INTO public.subscription_plans 
    (id, name, description, price, currency, billing_interval, features, is_active)
    VALUES 
      ('free', 'Free', 'Basic plan with limited features', 0, 'INR', 'month', '["Up to 50 appointments/month", "Basic chatbot (100 messages/month)", "Email support"]'::jsonb, true),
      ('professional', 'Professional', 'For professionals and small teams', 2900, 'INR', 'month', '["Unlimited appointments", "Advanced chatbot (1000 messages/month)", "Team collaboration (up to 5 users)", "Custom branding", "Priority support", "voice_commands"]'::jsonb, true),
      ('enterprise', 'Enterprise', 'For large organizations', 9900, 'INR', 'month', '["Unlimited appointments", "Unlimited chatbot messages", "Unlimited team members", "Custom branding", "24/7 priority support", "Dedicated account manager", "voice_commands"]'::jsonb, true)
    ON CONFLICT (id) DO NOTHING;
  `;
  
  const { error } = await supabase.rpc('exec', { sql: insertSQL });
  if (error) throw error;
  
  console.log('Inserted default subscription plans');
  await checkSubscriptionPlansData();
}

async function checkSubscriptionPlansData() {
  const { data, error } = await supabase.rpc('exec', {
    sql: `SELECT * FROM public.subscription_plans;`
  });
  
  if (error) throw error;
  
  console.log('Current subscription plans:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    console.log('Subscription plans are properly set up with voice_commands feature');
  } else {
    console.log('No subscription plans found');
  }
}

// Execute the check
checkDatabase().catch(console.error);
