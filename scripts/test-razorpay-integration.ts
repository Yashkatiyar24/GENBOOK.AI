import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import axios from 'axios';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'server/.env' });

// Initialize clients
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test user and tenant details
const TEST_TENANT_ID = 'test-tenant-123';
const TEST_USER_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function testRazorpayIntegration() {
  console.log('Starting Razorpay integration test...');
  
  try {
    // 1. Create a test user
    console.log('Creating test user...');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Failed to create test user');
    
    console.log(`Created test user: ${authData.user.email}`);
    
    // 2. Create a test tenant
    console.log('Creating test tenant...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ id: TEST_TENANT_ID, name: 'Test Tenant' }])
      .select()
      .single();
      
    if (tenantError) throw tenantError;
    console.log(`Created test tenant: ${tenantData.id}`);
    
    // 3. Create a subscription
    console.log('Creating test subscription...');
    const planId = process.env.VITE_RAZORPAY_PROFESSIONAL_PLAN_ID;
    if (!planId) throw new Error('Missing VITE_RAZORPAY_PROFESSIONAL_PLAN_ID');
    
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // 1 year
      notes: {
        tenantId: TEST_TENANT_ID,
        email: TEST_USER_EMAIL,
      },
      notify_info: {
        notify_email: TEST_USER_EMAIL,
      },
    });
    
    console.log(`Created test subscription: ${subscription.id}`);
    
    // 4. Simulate webhook event
    console.log('Simulating webhook event...');
    const webhookPayload = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: subscription.id,
            plan_id: planId,
            status: 'active',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
            notes: {
              tenantId: TEST_TENANT_ID,
            },
          },
        },
      },
    };
    
    // Generate webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');
    
    // Send webhook to local server
    const webhookUrl = 'http://localhost:3001/webhooks/razorpay';
    const response = await axios.post(webhookUrl, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature,
      },
    });
    
    console.log('Webhook response:', response.status, response.data);
    
    // 5. Verify subscription in database
    console.log('Verifying subscription in database...');
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', TEST_TENANT_ID)
      .single();
      
    if (subError) throw subError;
    
    if (subscriptionData && subscriptionData.razorpay_subscription_id === subscription.id) {
      console.log('✅ Subscription successfully created and verified in database');
    } else {
      console.error('❌ Failed to verify subscription in database');
    }
    
    console.log('\n🎉 Integration test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Integration test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  } finally {
    // Cleanup (optional)
    // await supabase.auth.admin.deleteUser(authData.user.id);
    // await supabase.from('tenants').delete().eq('id', TEST_TENANT_ID);
  }
}

// Run the test
testRazorpayIntegration();
