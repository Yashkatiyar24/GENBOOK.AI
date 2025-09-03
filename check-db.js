import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Check if subscription_plans table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) throw tablesError;
    
    console.log('Available tables:', tables.map(t => t.table_name));
    
    // Check if subscription_plans exists
    const hasSubscriptionPlans = tables.some(t => t.table_name === 'subscription_plans');
    
    if (!hasSubscriptionPlans) {
      console.log('subscription_plans table does not exist. Running migrations...');
      // Run migrations
      const { exec } = await import('child_process');
      exec('node run-migrations.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Error running migrations:', error);
          return;
        }
        console.log('Migrations output:', stdout);
        if (stderr) console.error('Migrations error:', stderr);
      });
    } else {
      console.log('subscription_plans table exists. Checking contents...');
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*');
      
      if (plansError) throw plansError;
      console.log('Current subscription plans:', plans);
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase();
