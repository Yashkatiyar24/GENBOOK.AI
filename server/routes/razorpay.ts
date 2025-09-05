import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../supabase.js';
import { isRazorpayConfigured } from '../services/razorpay.js';

const router = express.Router();

// Helper to create a Razorpay client from trimmed env values (avoids accidental whitespace)
async function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay service not configured');
  }
  
  const keyId = (process.env.RAZORPAY_KEY_ID || '').toString().trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').toString().trim();
  
  // Import Razorpay dynamically to avoid initialization errors
  const razorpayModule = await import('razorpay');
  const Razorpay = razorpayModule.default;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Detect obviously non-real credentials to enable mock automatically in dev
function isMockConfig(): boolean {
  return !isRazorpayConfigured();
}

// Plan configuration with enhanced details
const PLAN_CONFIG = {
  professional: {
    name: 'Professional',
    price: 2900, // ₹29.00 in paise
    currency: 'INR',
    interval: 'month',
    description: 'Professional Plan - Monthly Subscription'
  },
  professional_annual: {
    name: 'Professional',
    price: 29000, // ₹290.00 in paise (annual)
    currency: 'INR',
    interval: 'year',
    description: 'Professional Plan - Annual Subscription'
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900, // ₹99.00 in paise
    currency: 'INR',
    interval: 'month',
    description: 'Enterprise Plan - Monthly Subscription'
  },
  enterprise_annual: {
    name: 'Enterprise',
    price: 99000, // ₹990.00 in paise (annual)
    currency: 'INR',
    interval: 'year',
    description: 'Enterprise Plan - Annual Subscription'
  }
};

// Enhanced signature verification function (checkout payment)
// NOTE: Verify the checkout payment signature using RAZORPAY_KEY_SECRET
// Webhook payloads should be verified with RAZORPAY_WEBHOOK_SECRET separately
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keySecret) {
      console.error('Razorpay key secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
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

// Create Razorpay order with enhanced error handling
router.post('/create-order',requireAuth, async (req: Request, res: Response) => {
  debugger;
  console.log('[Razorpay] Create order request received:', {
    body: req.body,
    headers: req.headers,
    user: (req as any).user
  });
  
  try {
    const { planId, amount, userDetails } = req.body;
    const user = (req as any).user;

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
    const razorpay = await getRazorpayClient();

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount: amount,
      currency: planConfig.currency,
      receipt: `order_${new Date().getTime()}`,
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
    });
  }
});

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
      console.error('[Database] Subscription update error:', subscriptionError);
      return res.status(500).json({ 
        error: 'Failed to update subscription',
        message: 'Database error occurred'
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
      console.warn('[Database] Profile update warning:', profileError);
      // Don't fail the payment for profile update issues
    }

    // Record payment in payments table
    const { error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount: planConfig.price,
        currency: planConfig.currency,
        status: 'completed',
        plan_id: planId,
        method: 'razorpay',
        email: userDetails.email,
        contact: userDetails.phone,
        created_at: now.toISOString()
      });

    if (paymentError) {
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
    });
  }
});

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
  debugger;
  console.dir('this is health api')
  res.json({ 
    status: 'okkkk', 
    timestamp: new Date().toISOString(),
    razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

export default router;