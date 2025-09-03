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

async function checkUserSubscription() {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError?.message || 'No user logged in');
      return;
    }

    console.log(`Checking subscription for user: ${user.email} (${user.id})`);
    
    // Check if user_subscriptions table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'user_subscriptions')
      .single();

    if (tableError || !tableExists) {
      console.error('Error: user_subscriptions table does not exist');
      return;
    }

    // Get the user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      console.log('No subscription found for user. Creating a free tier subscription...');
      await createFreeTierSubscription(user.id);
      return;
    }

    console.log('User subscription:', subscription);
    
    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan details:', planError);
      return;
    }

    console.log('Plan details:', plan);
    console.log('Features:', plan.features);
    console.log('Has voice_commands:', plan.features.includes('voice_commands'));

  } catch (error) {
    console.error('Error checking user subscription:', error);
  }
}

async function createFreeTierSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert([
        { 
          user_id: userId,
          plan_id: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        }
      ])
      .select();

    if (error) throw error;
    
    console.log('Created free tier subscription:', data);
    
  } catch (error) {
    console.error('Error creating free tier subscription:', error);
  }
}

// Run the check
checkUserSubscription().catch(console.error);
