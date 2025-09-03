import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_id, subscription_id, user_id } = await req.json();

    if (!payment_id || !subscription_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Get subscription details from Razorpay
    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${Deno.env.get('RAZORPAY_KEY_SECRET')}`)}`,
        },
      }
    );

    if (!razorpayResponse.ok) {
      const error = await razorpayResponse.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    const subscriptionData = await razorpayResponse.json();
    const planId = subscriptionData.plan_id;
    const status = subscriptionData.status;
    const currentPeriodStart = new Date(subscriptionData.start_at * 1000).toISOString();
    const currentPeriodEnd = new Date(subscriptionData.end_at * 1000).toISOString();

    // Update or create the user's subscription
    const { data: existingSubscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .upsert(
        {
          user_id,
          plan_id: planId,
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          razorpay_subscription_id: subscription_id,
          razorpay_payment_id: payment_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,plan_id' }
      )
      .select()
      .single();

    if (subscriptionError) {
      throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
    }

    // Update the user's profile with the new subscription status
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_plan: planId,
        subscription_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (profileError) {
      throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: existingSubscription 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Payment success handler error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
