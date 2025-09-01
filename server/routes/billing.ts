import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { createSubscription, cancelSubscription, isRazorpayConfigured } from '../services/razorpay';

// Helper function to get user's current subscription
async function getCurrentSubscription(tenantId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  
  if (error && (error as any).code !== 'PGRST116') throw error;
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

    if (error && (error as any).code !== 'PGRST116') throw error; // not found is ok
    
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
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', data.razorpay_subscription_id)
          .single();
        
        if (subError) {
          console.error('Error fetching subscription details:', subError);
          return res.json(data);
        }
        
        return res.json({
          ...data,
          status: subscription?.status || data.status,
          current_period_end: subscription?.current_period_end || data.current_period_end
        });
      } catch (error) {
        console.error('Error fetching subscription details:', error);
        // Return the stored data if we can't fetch details
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

// Create or update subscription (high-level endpoint)
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    const userId = (req as any).userId as string | undefined;
    const { planId, successUrl, cancelUrl } = req.body;

    if (!tenantId || !userId || !planId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Create Razorpay subscription via service wrapper
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

    res.json({
      success: true,
      subscription: result.subscription,
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID,
        subscription_id: result.subscription.id,
        prefill: {
          name: user.full_name || '',
          email: user.email,
          contact: user.phone || ''
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

// Create subscription directly (lower-level)
router.post('/create-subscription', async (req: Request, res: Response) => {
  try {
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
      .select('email, full_name as name')
      .eq('id', userId)
      .single();

    // Create subscription in Razorpay via service
    const result = await createSubscription(planId, {
      name: user?.name || '',
      email: user?.email || '',
      userId
    });

    if (!result.success || !result.subscription) {
      throw new Error(result.error || 'Failed to create subscription');
    }

    const subscription = result.subscription;

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
      theme: { color: '#6366f1' },
      callback_url: successUrl,
      redirect: true
    });
  } catch (err: any) {
    console.error('POST /billing/create-subscription error', err);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

    // Get current subscription
    const currentSub = await getCurrentSubscription(tenantId);
    if (!currentSub?.razorpay_subscription_id) return res.status(400).json({ error: 'No active subscription found' });

    // Cancel subscription in Razorpay via helper
    const result = await cancelSubscription(currentSub.razorpay_subscription_id);
    if (!result.success) throw new Error(result.error || 'Failed to cancel subscription');

    // Update subscription status in database
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
        current_period_end: result.subscription?.end_at ? new Date(result.subscription.end_at * 1000).toISOString() : null
      })
      .eq('tenant_id', tenantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('POST /billing/cancel-subscription error', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
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
      
    if (error || !subscription?.razorpay_subscription_id) return res.status(400).json({ error: 'No active subscription found' });

    const portalUrl = `https://dashboard.razorpay.com/app/subscriptions/${subscription.razorpay_subscription_id}`;
    res.json({ url: portalUrl, message: 'Manage your subscription on Razorpay', subscriptionId: subscription.razorpay_subscription_id });
  } catch (err: any) {
    console.error('POST /billing/portal-session error', err);
    res.status(500).json({ error: 'Failed to create portal session', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

// Get Razorpay plans (static fallback)
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = [
      { id: 'basic', name: 'Basic Plan', description: 'Basic subscription plan', price: 999, currency: 'INR', interval: 'monthly', features: ['Feature 1', 'Feature 2'] },
      { id: 'pro', name: 'Pro Plan', description: 'Professional subscription plan', price: 1999, currency: 'INR', interval: 'monthly', features: ['All Basic features', 'Priority Support', 'Advanced Analytics'] }
    ];
    res.json(plans);
  } catch (err: any) {
    console.error('GET /billing/plans error', err);
    res.status(500).json({ error: 'Failed to fetch plans', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;

