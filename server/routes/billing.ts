import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import Razorpay from 'razorpay';
import { createSubscription, cancelSubscription, getSubscription } from '../services/razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper function to get user's current subscription
async function getCurrentSubscription(tenantId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

const router = Router();

// Get current subscription for tenant
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(200).json({
        status: 'inactive',
        message: 'Billing is not configured. Please contact support.'
      });
    }

    // Get subscription from database
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // not found is ok
    
    // If no subscription exists, return default state
    if (!data) {
      return res.status(200).json({
        status: 'inactive',
        plan: null,
        current_period_end: null
      });
    }

    // If there's a Razorpay subscription ID, fetch the latest status
    if (data.razorpay_subscription_id) {
      try {
        const subscription = await razorpay.subscriptions.fetch(data.razorpay_subscription_id);
        return res.json({
          ...data,
          status: subscription.status,
          current_period_end: subscription.end_at ? new Date(subscription.end_at * 1000).toISOString() : null
        });
      } catch (error) {
        console.error('Error fetching Razorpay subscription:', error);
        // Return the stored data if we can't fetch from Razorpay
        return res.json(data);
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('GET /billing/subscription error', err);
    res.status(500).json({ 
      error: 'Failed to load subscription',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create or update subscription
router.post('/subscribe', async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string | undefined;
  const userId = (req as any).userId as string | undefined;
  const { planId, successUrl, cancelUrl } = req.body;

  if (!tenantId || !userId || !planId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check current subscription
    const currentSub = await getCurrentSubscription(tenantId);
    
    // Create Razorpay subscription
    const result = await createSubscription(planId, {
      name: user.full_name || '',
      email: user.email,
      contact: user.phone || ''
    });

    if (!result.success || !result.subscription) {
      throw new Error(result.error || 'Failed to create subscription');
    }

    // Update subscription in database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        tenant_id: tenantId,
        razorpay_subscription_id: result.subscription.id,
        plan_id: planId,
        status: result.subscription.status || 'created',
        current_period_end: result.subscription.end_at 
          ? new Date(result.subscription.end_at * 1000).toISOString()
          : null,
        razorpay_plan_id: planId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      });

    if (dbError) throw dbError;

    // Return the subscription details for frontend to handle the payment
    res.json({
      success: true,
      subscription: result.subscription,
      key: process.env.RAZORPAY_KEY_ID,
      // Frontend will use these to show the Razorpay payment dialog
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID,
        subscription_id: result.subscription.id,
        name: user.full_name || '',
        email: user.email,
        contact: user.phone || '',
        prefill: {
          name: user.full_name || '',
          email: user.email,
          contact: user.phone || ''
        },
        theme: {
          color: '#6366f1' // indigo-500
        },
        handler: async (response: any) => {
          // This will be handled by the webhook
          console.log('Payment successful:', response);
        },
        modal: {
          ondismiss: () => {
            // Handle modal close
            console.log('Payment modal dismissed');
          }
        }
      }
    });

  } catch (error: any) {
    console.error('Subscription error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process subscription',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// Create subscription
router.post('/create-subscription', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId as string | undefined;
    const userId = (req as any).userId as string | undefined;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Missing auth/tenant context' });

    const { planId, successUrl, cancelUrl } = req.body || {};
    if (!planId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'planId, successUrl, and cancelUrl are required' });
    }

    // Get user email for Razorpay customer
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Create subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // 1 year subscription
      notes: {
        tenantId,
        userId,
        email: user?.email || ''
      },
      notify_info: {
        notify_email: user?.email || ''
      }
    });

    // Store subscription in database
    await supabase
      .from('subscriptions')
      .upsert({
        tenant_id: tenantId,
        razorpay_subscription_id: subscription.id,
        status: subscription.status,
        plan: planId,
        current_period_end: subscription.end_at ? new Date(subscription.end_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

    // Return the subscription ID and other necessary data
    res.json({
      subscriptionId: subscription.id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      email: user?.email,
      name: user?.name || '',
      prefill: {
        name: user?.name || '',
        email: user?.email || ''
      },
      theme: {
        color: '#6366f1' // indigo-500
      },
      callback_url: successUrl,
      redirect: true
    });
  } catch (err: any) {
    console.error('POST /billing/create-subscription error', err);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });

// Cancel subscription
router.post('/cancel-subscription', async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Missing tenant context' });
  }

  try {
    // Get current subscription
    const currentSub = await getCurrentSubscription(tenantId);
    if (!currentSub?.razorpay_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel subscription in Razorpay
    const result = await cancelSubscription(currentSub.razorpay_subscription_id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel subscription');
    }

    // Update subscription status in database
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
        current_period_end: result.subscription?.end_at 
          ? new Date(result.subscription.end_at * 1000).toISOString()
          : null
      })
      .eq('tenant_id', tenantId);

    if (error) throw error;

  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    
    // Verify the webhook signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '');
    hmac.update(body);
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const subscription = req.body.payload.subscription?.entity;
    const payment = req.body.payload.payment?.entity;

    if (!subscription) {
      return res.status(400).json({ error: 'No subscription in webhook payload' });
    }

    // Update subscription in database based on event
    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.pending':
      case 'subscription.halted':
      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.paused':
      case 'subscription.resumed':
        await supabase
          .from('subscriptions')
          .upsert({
            razorpay_subscription_id: subscription.id,
            status: subscription.status,
            plan: subscription.plan_id,
            current_period_end: subscription.end_at ? new Date(subscription.end_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'razorpay_subscription_id' });
        break;

      case 'payment.captured':
        if (payment && subscription) {
          await supabase
            .from('payments')
            .insert({
              razorpay_payment_id: payment.id,
              razorpay_subscription_id: subscription.id,
              amount: payment.amount / 100, // Convert to base unit
              currency: payment.currency,
              status: payment.status,
              created_at: new Date().toISOString()
            });
        }
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook handler failed' });
  }
});

// Customer portal URL
router.post('/portal-session', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

    // Get the subscription to verify it exists
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, status')
      .eq('tenant_id', tenantId)
      .single();
      
    if (error || !subscription?.razorpay_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Return the Razorpay portal URL or instructions
    // Note: Razorpay doesn't have a direct portal like Stripe, so we return the subscription ID
    // The frontend can use this to redirect to the Razorpay subscription management page
    const portalUrl = `https://dashboard.razorpay.com/app/subscriptions/${subscription.razorpay_subscription_id}`;
    
    res.json({ 
      url: portalUrl,
      message: 'Manage your subscription on Razorpay',
      subscriptionId: subscription.razorpay_subscription_id
    });
  } catch (err: any) {
    console.error('POST /billing/portal-session error', err);
    res.status(500).json({ 
      error: 'Failed to create portal session',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get Razorpay plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    // In a real implementation, you would fetch plans from Razorpay API
    // For now, return a static list of plans that should match your Razorpay dashboard
    const plans = [
      {
        id: 'basic',
        name: 'Basic Plan',
        description: 'Basic subscription plan',
        price: 999, // in paise (₹9.99)
        currency: 'INR',
        interval: 'monthly',
        features: ['Feature 1', 'Feature 2']
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        description: 'Professional subscription plan',
        price: 1999, // in paise (₹19.99)
        currency: 'INR',
        interval: 'monthly',
        features: ['All Basic features', 'Priority Support', 'Advanced Analytics']
      }
    ];
    
    res.json(plans);
  } catch (err: any) {
    console.error('GET /billing/plans error', err);
    res.status(500).json({ 
      error: 'Failed to fetch plans',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('POST /billing/webhook error', err?.message || err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;

// Export a standalone webhook handler so we can attach express.raw middleware in server/index.ts
export async function webhookHandler(req: Request, res: Response) {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
      return res.status(400).send('Missing stripe-signature or webhook secret');
    }

    const event = (stripe as any).webhooks.constructEvent((req as any).rawBody || req.body, sig, webhookSecret);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await upsertSubscriptionFromEvent(tenantId, sub);
        }
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const tenantId = invoice.metadata?.tenantId;
        if (tenantId) {
          await recordInvoicePayment(tenantId, invoice);
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error', err?.message || err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
