import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../supabase.js';

const router = express.Router();

// Helper to create a Razorpay client from trimmed env values (avoids accidental whitespace)
function getRazorpayClient() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').toString().trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').toString().trim();
<<<<<<< HEAD
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }
  
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Detect obviously non-real credentials to enable mock automatically in dev
function isMockConfig(): boolean {
  const id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!id || !secret) return true;
  const placeholders = ['placeholder', 'example', 'xxxx', 'your_razorpay_key'];
  return placeholders.some(p => id.includes(p) || secret.includes(p));
}

// Plan configuration with enhanced details
=======
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Plan configuration
// Prices are stored in paise (INR * 100) to match Razorpay's expected integer amount
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
const PLAN_CONFIG = {
  professional: {
    name: 'Professional',
    price: 2900, // ₹29.00 in paise
    currency: 'INR',
<<<<<<< HEAD
    interval: 'month',
    description: 'Professional Plan - Monthly Subscription'
=======
    interval: 'month'
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
  },
  professional_annual: {
    name: 'Professional',
    price: 29000, // ₹290.00 in paise (annual)
    currency: 'INR',
<<<<<<< HEAD
    interval: 'year',
    description: 'Professional Plan - Annual Subscription'
=======
    interval: 'year'
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900, // ₹99.00 in paise
    currency: 'INR',
<<<<<<< HEAD
    interval: 'month',
    description: 'Enterprise Plan - Monthly Subscription'
=======
    interval: 'month'
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
  },
  enterprise_annual: {
    name: 'Enterprise',
    price: 99000, // ₹990.00 in paise (annual)
    currency: 'INR',
<<<<<<< HEAD
    interval: 'year',
    description: 'Enterprise Plan - Annual Subscription'
  }
};

// Enhanced signature verification function
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

=======
    interval: 'year'
  }
};

>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
// Middleware to verify authentication
const requireAuth = async (req: Request, res: Response, next: any) => {
  try {
    // Development-only bypass: if X-Skip-Auth header is present and we're not in production,
    // attach a lightweight fake user and continue. This is useful for local testing only.
    if (process.env.NODE_ENV !== 'production' && (req.headers['x-skip-auth'] === 'true' || req.headers['x-skip-auth'] === '1')) {
      (req as any).user = {
        id: process.env.TEST_USER_ID || 'local-test-user',
        email: process.env.TEST_USER_EMAIL || 'test@example.com'
      };
      return next();
    }
<<<<<<< HEAD
    
=======
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

<<<<<<< HEAD
// Create Razorpay order with enhanced error handling
router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  console.log('[Razorpay] Create order request received:', {
    body: req.body,
    headers: req.headers,
    user: (req as any).user
  });
  
=======
// Create Razorpay order
router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  try {
    // Early check for Razorpay credentials to give a clear error instead of a vague 500
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('[Razorpay] Missing Razorpay credentials in environment variables');
      return res.status(500).json({ error: 'Razorpay credentials not configured on server', debug: { RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET } });
    }
  } catch (err) {
    console.error('[Razorpay] Error during credentials check:', err);
    return res.status(500).json({ error: 'Server misconfiguration', debug: { err: (err as any).message } });
  }
  
  debugger;
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
  try {
    const { planId, amount, userDetails } = req.body;
    const user = (req as any).user;

<<<<<<< HEAD
    // Dev-only switch to force mock even if credentials exist
    const forceMock = process.env.NODE_ENV !== 'production' && (req.headers['x-mock-razorpay'] === 'true' || req.headers['x-mock-razorpay'] === '1' || isMockConfig());

    if (forceMock) {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        receipt: `mock_receipt_${Date.now()}`,
        status: 'created'
      };
      console.log('[Razorpay] Forced mock order (dev):', mockOrder);
      return res.json(mockOrder);
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log('[Razorpay] Credentials not configured, using mock mode');
      
      // Return mock order for testing
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        receipt: `mock_receipt_${Date.now()}`,
        status: 'created'
      };
      
      console.log('[Razorpay] Mock order created:', mockOrder);
      
      return res.json({
        id: mockOrder.id,
        amount: mockOrder.amount,
        currency: mockOrder.currency,
        receipt: mockOrder.receipt,
        status: mockOrder.status
      });
    }

    // Validate required fields
    if (!planId || !amount || !userDetails) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['planId', 'amount', 'userDetails']
      });
    }

    // Validate user details
    if (!userDetails.fullName || !userDetails.email || !userDetails.phone) {
      return res.status(400).json({ 
        error: 'Missing required user details',
        required: ['fullName', 'email', 'phone']
      });
    }

    // Validate plan configuration
    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
    if (!planConfig) {
      return res.status(400).json({ 
        error: 'Invalid plan selected',
        availablePlans: Object.keys(PLAN_CONFIG)
      });
    }

    // Validate amount matches plan
    if (amount !== planConfig.price) {
      return res.status(400).json({ 
        error: 'Amount mismatch',
        expected: planConfig.price,
        received: amount
      });
    }

    // Initialize Razorpay client
    const razorpay = getRazorpayClient();

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount: amount,
      currency: planConfig.currency,
      receipt: `order_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        userEmail: user.email,
        planId: planId,
        planName: planConfig.name,
        company: userDetails.company || ''
      }
    });

    // Log order creation for debugging
    console.log(`[Razorpay] Order created: ${order.id} for user ${user.id}, plan ${planId}`);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status
    });

  } catch (error: any) {
    console.error('[Razorpay] Create order error:', error?.error || error);
    
    if (error?.error?.description) {
      return res.status(400).json({ 
        error: 'Payment gateway error',
        message: error.error.description,
        code: error.error?.code || undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create payment order',
      message: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : 'Internal server error'
=======
    if (!planId || !amount || !userDetails) {
      console.error('[Razorpay] Missing required fields:', { planId, amount, userDetails });
      return res.status(400).json({ error: 'Missing required fields', debug: { planId, amount, userDetails } });
    }

    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
    if (!planConfig) {
      console.error('[Razorpay] Invalid plan selected:', planId);
      return res.status(400).json({ error: 'Invalid plan selected', debug: { planId } });
    }

    // Create order with Razorpay
    const orderOptions = {
      amount: planConfig.price, // Amount in paise (integer)
      currency: planConfig.currency,
      receipt: `order_${user.id}_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan_id: planId,
        plan_name: planConfig.name,
        user_email: userDetails.email,
        user_name: userDetails.fullName,
        user_phone: userDetails.phone,
        company: userDetails.company || ''
      }
    };

    try {
      // Development-only mock: if X-Mock-Razorpay header is present or TEST_RAZORPAY_MOCK is true,
      // return a fake order object so local testing works without valid Razorpay credentials.
      const isMock = process.env.NODE_ENV !== 'production' && (req.headers['x-mock-razorpay'] === '1' || req.headers['x-mock-razorpay'] === 'true' || process.env.TEST_RAZORPAY_MOCK === 'true');
      if (isMock) {
        console.log('[Razorpay] Mock mode enabled - returning fake order for local testing', { orderOptions });
        const fakeOrder = {
          id: `order_fake_${Date.now()}`,
          amount: orderOptions.amount,
          currency: orderOptions.currency,
          receipt: orderOptions.receipt
        };

        // Store fake order in DB for parity with real flow (best-effort)
        try {
          await supabase.from('payment_orders').insert({
            order_id: fakeOrder.id,
            user_id: user.id,
            plan_id: planId,
            amount: planConfig.price,
            currency: planConfig.currency,
            status: 'created',
            user_details: userDetails,
            created_at: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn('[Razorpay] Failed to store mock order in DB:', dbErr);
        }

        return res.json({
          id: fakeOrder.id,
          amount: fakeOrder.amount,
          currency: fakeOrder.currency,
          receipt: fakeOrder.receipt,
          debug: { orderOptions, mock: true }
        });
      }

  console.log('[Razorpay] Creating order with options:', orderOptions);
  const order = await getRazorpayClient().orders.create(orderOptions);

      // Store order details in database for verification
      const { error: dbError } = await supabase
        .from('payment_orders')
        .insert({
          order_id: order.id,
          user_id: user.id,
          plan_id: planId,
          amount: planConfig.price,
          currency: planConfig.currency,
          status: 'created',
          user_details: userDetails,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('[Razorpay] Error storing order in DB:', dbError);
        // Continue anyway, as order creation succeeded
      }

      res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        debug: { orderOptions }
      });
    } catch (rzpError: any) {
      console.error('[Razorpay] Error creating order with Razorpay:', rzpError, { orderOptions });
      return res.status(500).json({ error: rzpError.message || 'Failed to create order', debug: { orderOptions, rzpError } });
    }

  } catch (error: any) {
    console.error('[Razorpay] Unexpected error in create-order:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create order',
      debug: { error }
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    });
  }
});

<<<<<<< HEAD
// Enhanced payment verification with comprehensive database updates
router.post('/verify-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      planId, 
      userDetails 
    } = req.body;
    
    const user = (req as any).user;

    // Dev-only switch to force mock verification
    const forceMock = process.env.NODE_ENV !== 'production' && (req.headers['x-mock-razorpay'] === 'true' || req.headers['x-mock-razorpay'] === '1' || isMockConfig());

    // Check if Razorpay is configured or mock forced
    if (forceMock || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log('[Razorpay] Credentials not configured, using mock verification');
      
      // Mock successful payment verification
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      console.log('[Razorpay] Mock payment verified successfully');
      
      return res.json({
        success: true,
        message: 'Payment verified successfully (mock mode)',
        subscription: {
          plan: planId,
          status: 'active',
          current_period_end: periodEnd.toISOString()
        }
      });
    }

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ 
        error: 'Missing payment verification details',
        required: ['razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature', 'planId']
      });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error(`[Razorpay] Invalid signature for payment ${razorpay_payment_id}`);
      return res.status(400).json({ 
        error: 'Payment verification failed',
        message: 'Invalid payment signature'
      });
    }

    // Get plan configuration
    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Calculate subscription period
    const now = new Date();
    const monthsToAdd = planConfig.interval === 'year' ? 12 : 1;
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());
=======
// Verify payment and update subscription
router.post('/verify-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planId,
      userDetails
    } = req.body;
    const user = (req as any).user;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

  // Get order details from Razorpay to verify amount
  const order = await getRazorpayClient().orders.fetch(razorpay_order_id);
    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];

    if (!planConfig || order.amount !== planConfig.price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order amount mismatch' 
      });
    }

  // Calculate subscription period based on plan interval
  const now = new Date();
  const monthsToAdd = planConfig.interval === 'year' ? 12 : 1;
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db

    // Update user subscription in database
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan: planId,
        status: 'active',
        razorpay_payment_id,
        razorpay_order_id,
        amount_paid: planConfig.price,
        currency: planConfig.currency,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
<<<<<<< HEAD
      console.error('[Database] Subscription update error:', subscriptionError);
      return res.status(500).json({ 
        error: 'Failed to update subscription',
        message: 'Database error occurred'
=======
      console.error('Database error:', subscriptionError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update subscription' 
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      });
    }

    // Update user profile with billing details
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: userDetails.fullName,
        phone: userDetails.phone,
        company: userDetails.company,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
<<<<<<< HEAD
      console.warn('[Database] Profile update warning:', profileError);
      // Don't fail the payment for profile update issues
=======
      console.warn('Failed to update user profile:', profileError);
      // Don't fail the payment for this
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    }

    // Record payment in payments table
    const { error: paymentError } = await supabase
<<<<<<< HEAD
      .from('payment_history')
=======
      .from('payments')
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
      .insert({
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id,
<<<<<<< HEAD
        razorpay_signature,
=======
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
        amount: planConfig.price,
        currency: planConfig.currency,
        status: 'completed',
        plan_id: planId,
<<<<<<< HEAD
        method: 'razorpay',
        email: userDetails.email,
        contact: userDetails.phone,
=======
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
        created_at: now.toISOString()
      });

    if (paymentError) {
<<<<<<< HEAD
      console.warn('[Database] Payment record warning:', paymentError);
      // Don't fail the payment for payment record issues
    }

    // Send confirmation email (you can implement this)
    try {
      // await sendPaymentConfirmationEmail(user.email, planConfig, userDetails);
      console.log(`[Email] Payment confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.warn('[Email] Failed to send confirmation:', emailError);
    }

    console.log(`[Razorpay] Payment verified successfully: ${razorpay_payment_id} for user ${user.id}`);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        plan: planId,
        status: 'active',
        current_period_end: periodEnd.toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Razorpay] Payment verification error:', error?.error || error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      message: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : 'Internal server error'
=======
      console.warn('Failed to record payment:', paymentError);
      // Don't fail the payment for this
    }

    // Send confirmation email (optional)
    try {
      await sendConfirmationEmail(userDetails.email, userDetails.fullName, planConfig.name);
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError);
      // Don't fail the payment for email issues
    }

    res.json({ 
      success: true, 
      message: 'Payment verified and subscription updated successfully',
      plan: planId,
      amount: planConfig.price
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment verification failed' 
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db
    });
  }
});

<<<<<<< HEAD
// Get user's current subscription
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      subscription: subscription || null,
      plans: PLAN_CONFIG
    });

  } catch (error: any) {
    console.error('[Razorpay] Get subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscription',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Update subscription status to cancelled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        ...subscription,
        status: 'cancelled',
        cancel_at_period_end: true
      }
    });

  } catch (error: any) {
    console.error('[Razorpay] Cancel subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});
=======
// Webhook handler for Razorpay events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    const body = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body.toString());
    console.log('Razorpay webhook event:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to handle payment captured event
async function handlePaymentCaptured(payment: any) {
  try {
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'captured',
        captured_at: new Date().toISOString()
      })
      .eq('razorpay_payment_id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
    }
  } catch (error) {
    console.error('Error in handlePaymentCaptured:', error);
  }
}

// Helper function to handle payment failed event
async function handlePaymentFailed(payment: any) {
  try {
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'failed',
        failure_reason: payment.error_description || 'Payment failed'
      })
      .eq('razorpay_payment_id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

// Helper function to handle order paid event
async function handleOrderPaid(order: any) {
  try {
    // Additional processing when order is fully paid
    console.log('Order paid:', order.id);
  } catch (error) {
    console.error('Error in handleOrderPaid:', error);
  }
}

// Helper function to send confirmation email
async function sendConfirmationEmail(email: string, name: string, planName: string) {
  try {
    // Use your email service here
    // This is a placeholder - implement based on your email provider
    console.log(`Sending confirmation email to ${email} for ${planName} plan`);
    
    // Example with a simple email service call
    const emailData = {
      to: email,
      subject: `Welcome to GENBOOK.AI ${planName} Plan!`,
      template: 'subscription-confirmation',
      context: {
        user_name: name,
        plan_name: planName,
        app_name: 'GENBOOK.AI'
      }
    };

    // Implement your email sending logic here
    // await emailService.send(emailData);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}
>>>>>>> def17f3ceeefe0efd14d4fab3df1f2b8fd7a41db

export default router;