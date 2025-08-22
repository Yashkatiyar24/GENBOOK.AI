import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../supabase.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Plan configuration
const PLAN_CONFIG = {
  professional: {
    name: 'Professional',
    price: 2900, // ₹29.00 in paise
    currency: 'INR'
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900, // ₹99.00 in paise
    currency: 'INR'
  }
};

// Middleware to verify authentication
const requireAuth = async (req: Request, res: Response, next: any) => {
  try {
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

// Create Razorpay order
router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId, amount, userDetails } = req.body;
    const user = (req as any).user;

    if (!planId || !amount || !userDetails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create order with Razorpay
    const orderOptions = {
      amount: planConfig.price, // Amount in paise
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

    const order = await razorpay.orders.create(orderOptions);

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
      console.error('Error storing order:', dbError);
      // Continue anyway, as order creation succeeded
    }

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });

  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];

    if (!planConfig || order.amount !== planConfig.price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order amount mismatch' 
      });
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

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
      console.error('Database error:', subscriptionError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update subscription' 
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
      console.warn('Failed to update user profile:', profileError);
      // Don't fail the payment for this
    }

    // Record payment in payments table
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id,
        amount: planConfig.price,
        currency: planConfig.currency,
        status: 'completed',
        plan_id: planId,
        created_at: now.toISOString()
      });

    if (paymentError) {
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
    });
  }
});

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

export default router;