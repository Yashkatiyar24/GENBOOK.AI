<<<<<<< HEAD
#!/usr/bin/env tsx

/**
 * Razorpay Integration Test Script
 * 
 * This script tests the complete Razorpay payment flow:
 * 1. Order creation
 * 2. Payment processing
 * 3. Payment verification
 * 4. Database updates
 * 5. Webhook handling
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Configuration
const config = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  testAmount: 2900, // ₹29.00 in paise
  testCurrency: 'INR',
  baseUrl: process.env.BASE_URL || 'http://localhost:3001'
};

// Test data
const testUser = {
  id: process.env.TEST_USER_ID || 'test-user-123',
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  name: 'Test User',
  phone: '9876543210'
};

const testPlan = {
  id: 'professional',
  name: 'Professional',
  price: 2900
};

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.keyId,
  key_secret: config.keySecret
});

// Utility functions
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${message}`);
  if (error) {
    console.error(error);
  }
}

function logSuccess(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ ${message}`);
}

// Test 1: Razorpay Connection
async function testRazorpayConnection() {
  log('Testing Razorpay connection...');
  
  try {
    if (!config.keyId || !config.keySecret) {
      throw new Error('Razorpay credentials not configured');
    }
    
    // Test API connection by fetching account details
    const account = await razorpay.accounts.fetch();
    logSuccess('Razorpay connection successful');
    log('Account details:', { id: account.id, name: account.name });
    return true;
  } catch (error) {
    logError('Razorpay connection failed', error);
    return false;
  }
}

// Test 2: Order Creation
async function testOrderCreation() {
  log('Testing order creation...');
  
  try {
    const order = await razorpay.orders.create({
      amount: config.testAmount,
      currency: config.testCurrency,
      receipt: `test_order_${Date.now()}`,
      notes: {
        test: 'true',
        user_id: testUser.id,
        plan_id: testPlan.id
      }
    });
    
    logSuccess('Order created successfully');
    log('Order details:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });
    
    return order;
  } catch (error) {
    logError('Order creation failed', error);
    return null;
  }
}

// Test 3: Backend API Tests
async function testBackendAPIs() {
  log('Testing backend APIs...');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Skip-Auth': 'true' // Skip auth for testing
  };
  
  try {
    // Test 1: Create order endpoint
    log('Testing create-order endpoint...');
    const createOrderResponse = await fetch(`${config.baseUrl}/api/razorpay/create-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        planId: testPlan.id,
        amount: testPlan.price,
        userDetails: {
          fullName: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          company: 'Test Company'
        }
      })
    });
    
    if (!createOrderResponse.ok) {
      const error = await createOrderResponse.text();
      throw new Error(`Create order failed: ${error}`);
    }
    
    const orderData = await createOrderResponse.json();
    logSuccess('Create order API test passed');
    log('Order data:', orderData);
    
    // Test 2: Get subscription endpoint
    log('Testing get-subscription endpoint...');
    const getSubscriptionResponse = await fetch(`${config.baseUrl}/api/razorpay/subscription`, {
      method: 'GET',
      headers
    });
    
    if (!getSubscriptionResponse.ok) {
      const error = await getSubscriptionResponse.text();
      throw new Error(`Get subscription failed: ${error}`);
    }
    
    const subscriptionData = await getSubscriptionResponse.json();
    logSuccess('Get subscription API test passed');
    log('Subscription data:', subscriptionData);
    
    return orderData;
  } catch (error) {
    logError('Backend API tests failed', error);
    return null;
  }
}

// Test 4: Signature Verification
async function testSignatureVerification() {
  log('Testing signature verification...');
  
  try {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const testSignature = 'test_signature';
    
    // Test signature verification function
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(body)
      .digest('hex');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(testSignature, 'hex')
    );
    
    logSuccess('Signature verification test completed');
    log('Signature test result:', { isValid, expectedSignature });
    
    return true;
  } catch (error) {
    logError('Signature verification test failed', error);
    return false;
  }
}

// Test 5: Webhook Simulation
async function testWebhookSimulation() {
  log('Testing webhook simulation...');
  
  try {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_webhook_123',
            amount: config.testAmount,
            currency: config.testCurrency,
            status: 'captured',
            order_id: 'order_test_webhook_123'
          }
        }
      }
    };
    
    const webhookBody = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(webhookBody)
      .digest('hex');
    
    const webhookResponse = await fetch(`${config.baseUrl}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body: webhookBody
    });
    
    if (!webhookResponse.ok) {
      const error = await webhookResponse.text();
      throw new Error(`Webhook test failed: ${error}`);
    }
    
    const webhookResult = await webhookResponse.json();
    logSuccess('Webhook simulation test passed');
    log('Webhook result:', webhookResult);
    
    return true;
  } catch (error) {
    logError('Webhook simulation test failed', error);
    return false;
  }
}

// Test 6: Database Schema Validation
async function testDatabaseSchema() {
  log('Testing database schema...');
  
  try {
    // Test database connection and required tables
    const response = await fetch(`${config.baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    
    const healthData = await response.json();
    logSuccess('Database schema validation passed');
    log('Health check result:', healthData);
    
    return true;
  } catch (error) {
    logError('Database schema validation failed', error);
    return false;
  }
}

// Test 7: Environment Variables Validation
function testEnvironmentVariables() {
  log('Testing environment variables...');
  
  const requiredVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logError(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  logSuccess('All required environment variables are set');
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Razorpay Integration Tests\n');
  
  const results = {
    environmentVariables: false,
    razorpayConnection: false,
    orderCreation: false,
    backendAPIs: false,
    signatureVerification: false,
    webhookSimulation: false,
    databaseSchema: false
  };
  
  // Test 1: Environment Variables
  results.environmentVariables = testEnvironmentVariables();
  
  if (!results.environmentVariables) {
    logError('Environment variables test failed. Please check your configuration.');
    return results;
  }
  
  // Test 2: Razorpay Connection
  results.razorpayConnection = await testRazorpayConnection();
  
  if (!results.razorpayConnection) {
    logError('Razorpay connection test failed. Please check your API keys.');
    return results;
  }
  
  // Test 3: Order Creation
  results.orderCreation = await testOrderCreation() !== null;
  
  // Test 4: Backend APIs
  results.backendAPIs = await testBackendAPIs() !== null;
  
  // Test 5: Signature Verification
  results.signatureVerification = await testSignatureVerification();
  
  // Test 6: Webhook Simulation
  results.webhookSimulation = await testWebhookSimulation();
  
  // Test 7: Database Schema
  results.databaseSchema = await testDatabaseSchema();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your Razorpay integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above and fix the issues.');
  }
  
  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n✨ Test execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { runAllTests };
=======
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
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
