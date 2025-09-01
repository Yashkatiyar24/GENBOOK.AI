import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../supabase.js';

const router = express.Router();

// Verify webhook signature
function verifyWebhookSignature(body: Buffer, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

// Razorpay webhook handler
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!razorpaySignature) {
      console.error('[Webhook] Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    if (!webhookSecret) {
      console.error('[Webhook] Razorpay webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify the webhook signature
    const isValid = verifyWebhookSignature(req.body, razorpaySignature, webhookSecret);
    if (!isValid) {
      console.error('[Webhook] Invalid Razorpay signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    const { event: eventType, payload } = event;

    if (!eventType || !payload) {
      console.error('[Webhook] Invalid webhook payload', { eventType, payload });
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log(`[Webhook] Processing Razorpay event: ${eventType}`);

    // Check for duplicate events (idempotency)
    const eventId = `${eventType}_${payload.payment?.entity?.id || payload.subscription?.entity?.id || Date.now()}`;
    const { data: existingEvent } = await supabase
      .from('billing_events')
      .select('event_id')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
      return res.json({ received: true, message: 'Duplicate event ignored' });
    }

    // Record the event for idempotency
    await supabase
      .from('billing_events')
      .insert({
        event_id: eventId,
        provider: 'razorpay',
        created_at: new Date().toISOString()
      });

    // Handle different event types
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(payload.subscription.entity);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(payload.subscription.entity);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(payload.subscription.entity);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(payload.subscription.entity);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ error: error.message || 'Webhook handler failed' });
  }
});

// Helper functions for different event types
async function handlePaymentCaptured(payment: any) {
  try {
    console.log(`[Webhook] Payment captured: ${payment.id}`);
    
    // Update payment status in database
    const { error } = await supabase
      .from('payment_history')
      .update({ 
        status: 'captured',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_payment_id', payment.id);

    if (error) {
      console.error('[Webhook] Error updating payment status:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handlePaymentCaptured:', error);
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    console.log(`[Webhook] Payment failed: ${payment.id}`);
    
    // Update payment status in database
    const { error } = await supabase
      .from('payment_history')
      .update({ 
        status: 'failed',
        failure_reason: payment.error_description || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_payment_id', payment.id);

    if (error) {
      console.error('[Webhook] Error updating payment status:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handlePaymentFailed:', error);
  }
}

async function handleSubscriptionActivated(subscription: any) {
  try {
    console.log(`[Webhook] Subscription activated: ${subscription.id}`);
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date(subscription.current_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionActivated:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    console.log(`[Webhook] Subscription cancelled: ${subscription.id}`);
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionCancelled:', error);
  }
}

async function handleSubscriptionCharged(subscription: any) {
  try {
    console.log(`[Webhook] Subscription charged: ${subscription.id}`);
    
    // Update subscription with new period
    const { error } = await supabase
      .from('subscriptions')
      .update({
        current_period_start: new Date(subscription.current_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionCharged:', error);
  }
}

async function handleSubscriptionHalted(subscription: any) {
  try {
    console.log(`[Webhook] Subscription halted: ${subscription.id}`);
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'halted',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionHalted:', error);
  }
}

async function handleSubscriptionPaused(subscription: any) {
  try {
    console.log(`[Webhook] Subscription paused: ${subscription.id}`);
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionPaused:', error);
  }
}

async function handleSubscriptionResumed(subscription: any) {
  try {
    console.log(`[Webhook] Subscription resumed: ${subscription.id}`);
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionResumed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log(`[Webhook] Subscription updated: ${subscription.id}`);
    
    // Update subscription details
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
        current_period_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('[Webhook] Error updating subscription:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionUpdated:', error);
  }
}

export default router;
