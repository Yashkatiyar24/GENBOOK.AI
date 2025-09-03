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

async function checkSubscriptionPlans() {
  try {
    // Check if subscription_plans table exists
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'subscription_plans');

    if (tablesError) throw tablesError;
    
    if (tables.length === 0) {
      console.log('subscription_plans table does not exist. Creating it...');
      await createSubscriptionPlansTable();
    } else {
      console.log('subscription_plans table exists. Checking contents...');
      await checkSubscriptionPlansData();
    }
  } catch (error) {
    console.error('Error checking subscription plans:', error);
  }
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
    CREATE POLICY "Enable read access for all users" 
    ON public.subscription_plans
    FOR SELECT USING (true);
  `;
  
  const { error } = await supabase.rpc('exec', { sql: createTableSQL });
  if (error) throw error;
  
  console.log('Created subscription_plans table');
  
  // Insert default plans
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
}

async function checkSubscriptionPlansData() {
  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*');
    
  if (error) throw error;
  
  console.log('Current subscription plans:', plans);
  
  // Check if voice_commands feature exists in any plan
  const hasVoiceCommands = plans.some(plan => 
    plan.features && 
    Array.isArray(plan.features) && 
    plan.features.includes('voice_commands')
  );
  
  if (!hasVoiceCommands) {
    console.log('No plans have voice_commands feature. Updating plans...');
    await updatePlansWithVoiceCommands();
  } else {
    console.log('At least one plan has voice_commands feature');
  }
}

async function updatePlansWithVoiceCommands() {
  // Add voice_commands to professional and enterprise plans
  const updateSQL = `
    UPDATE public.subscription_plans 
    SET features = features || '["voice_commands"]'::jsonb,
        updated_at = NOW()
    WHERE id IN ('professional', 'enterprise')
    AND NOT features @> '["voice_commands"]'::jsonb;
  `;
  
  const { error } = await supabase.rpc('exec', { sql: updateSQL });
  if (error) throw error;
  
  console.log('Updated plans with voice_commands feature');
  
  // Verify the update
  await checkSubscriptionPlansData();
}

// Execute the check
checkSubscriptionPlans().catch(console.error);
