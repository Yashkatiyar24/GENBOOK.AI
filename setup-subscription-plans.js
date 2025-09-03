import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or anonymous key in environment variables');
  process.exit(1);
}

async function setupSubscriptionPlans() {
  try {
    // Create a client with the service role key if available
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Setting up subscription plans...');
    
    // Create the subscription_plans table
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
    
    // Execute the SQL using the SQL editor endpoint
    const { data: createResult, error: createError } = await supabase
      .from('sql')
      .select('*')
      .eq('query', createTableSQL);
    
    if (createError) throw createError;
    
    console.log('Created subscription_plans table');
    
    // Insert default plans
    const insertSQL = `
      INSERT INTO public.subscription_plans 
      (id, name, description, price, currency, billing_interval, features, is_active)
      VALUES 
        ('free', 'Free', 'Basic plan with limited features', 0, 'INR', 'month', '["Up to 50 appointments/month", "Basic chatbot (100 messages/month)", "Email support"]'::jsonb, true),
        ('professional', 'Professional', 'For professionals and small teams', 2900, 'INR', 'month', '["Unlimited appointments", "Advanced chatbot (1000 messages/month)", "Team collaboration (up to 5 users)", "Custom branding", "Priority support", "voice_commands"]'::jsonb, true),
        ('enterprise', 'Enterprise', 'For large organizations', 9900, 'INR', 'month', '["Unlimited appointments", "Unlimited chatbot messages", "Unlimited team members", "Custom branding", "24/7 priority support", "Dedicated account manager", "voice_commands"]'::jsonb, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        billing_interval = EXCLUDED.billing_interval,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `;
    
    const { data: insertResult, error: insertError } = await supabase
      .from('sql')
      .select('*')
      .eq('query', insertSQL);
    
    if (insertError) throw insertError;
    
    console.log('Inserted/updated subscription plans');
    
    // Verify the data
    const { data: plans, error: selectError } = await supabase
      .from('subscription_plans')
      .select('*');
    
    if (selectError) throw selectError;
    
    console.log('Current subscription plans:');
    console.log(plans);
    
    console.log('✅ Subscription plans setup completed successfully');
    
  } catch (error) {
    console.error('❌ Error setting up subscription plans:');
    console.error(error);
    
    // Try an alternative approach if the first one fails
    console.log('Trying alternative approach...');
    await tryAlternativeApproach();
  }
}

async function tryAlternativeApproach() {
  try {
    console.log('Trying alternative approach to set up subscription plans...');
    
    // Use the REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        sql: `
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
          
          -- Insert or update plans
          INSERT INTO public.subscription_plans 
          (id, name, description, price, currency, billing_interval, features, is_active)
          VALUES 
            ('free', 'Free', 'Basic plan with limited features', 0, 'INR', 'month', '["Up to 50 appointments/month", "Basic chatbot (100 messages/month)", "Email support"]'::jsonb, true),
            ('professional', 'Professional', 'For professionals and small teams', 2900, 'INR', 'month', '["Unlimited appointments", "Advanced chatbot (1000 messages/month)", "Team collaboration (up to 5 users)", "Custom branding", "Priority support", "voice_commands"]'::jsonb, true),
            ('enterprise', 'Enterprise', 'For large organizations', 9900, 'INR', 'month', '["Unlimited appointments", "Unlimited chatbot messages", "Unlimited team members", "Custom branding", "24/7 priority support", "Dedicated account manager", "voice_commands"]'::jsonb, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            billing_interval = EXCLUDED.billing_interval,
            features = EXCLUDED.features,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute SQL');
    }
    
    console.log('✅ Successfully set up subscription plans using alternative approach');
    
  } catch (error) {
    console.error('❌ Error in alternative approach:');
    console.error(error);
    
    console.log('\n💡 Manual Setup Required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
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
      
      -- Insert or update plans
      INSERT INTO public.subscription_plans 
      (id, name, description, price, currency, billing_interval, features, is_active)
      VALUES 
        ('free', 'Free', 'Basic plan with limited features', 0, 'INR', 'month', '["Up to 50 appointments/month", "Basic chatbot (100 messages/month)", "Email support"]'::jsonb, true),
        ('professional', 'Professional', 'For professionals and small teams', 2900, 'INR', 'month', '["Unlimited appointments", "Advanced chatbot (1000 messages/month)", "Team collaboration (up to 5 users)", "Custom branding", "Priority support", "voice_commands"]'::jsonb, true),
        ('enterprise', 'Enterprise', 'For large organizations', 9900, 'INR', 'month', '["Unlimited appointments", "Unlimited chatbot messages", "Unlimited team members", "Custom branding", "24/7 priority support", "Dedicated account manager", "voice_commands"]'::jsonb, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        billing_interval = EXCLUDED.billing_interval,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `);
  }
}

// Run the setup
setupSubscriptionPlans().catch(console.error);
