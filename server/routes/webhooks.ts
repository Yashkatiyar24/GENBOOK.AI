import express from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';
import crypto from 'crypto';

const router = express.Router();

// Verify Razorpay webhook signature
const verifyWebhookSignature = (webhookBody: any, signature: string, secret: string): boolean => {
  const hmac = crypto.createHmac('sha256', secret);
  const generatedSignature = hmac.update(JSON.stringify(webhookBody)).digest('hex');
  return generatedSignature === signature;
};

// Inbound SMS webhook (public). For production, validate provider signature.
router.post('/sms', express.json(), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) return res.status(400).json({ error: 'Missing x-tenant-id header' });

    const { from, to, body, conversation_id } = req.body || {};
    if (!body || !conversation_id) return res.status(400).json({ error: 'body and conversation_id are required' });

    const { data, error } = await supabase
      .from('communications_messages')
      .insert([{ tenant_id: tenantId, conversation_id, sender_contact_id: null, body: String(body) }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ ok: true, id: data?.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Webhook error' });
  }
});

// Razorpay webhook handler
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!razorpaySignature) {
      console.error('Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify the webhook signature
    const isValid = verifyWebhookSignature(req.body, razorpaySignature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Razorpay signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload?.subscription?.entity || req.body.payload?.payment?.entity;

    if (!event || !payload) {
      console.error('Invalid webhook payload', { event, payload });
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log(`Processing Razorpay webhook: ${event}`);

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.updated':
        await handleSubscriptionUpdate(payload);
        break;

      case 'subscription.cancelled':
      case 'subscription.paused':
      case 'subscription.halted':
        await updateSubscriptionStatus(payload.id, 'cancelled');
        break;

      case 'subscription.resumed':
        await updateSubscriptionStatus(payload.id, 'active');
        break;

      case 'subscription.pending':
        await updateSubscriptionStatus(payload.id, 'pending');
        break;

      default:
        console.log(`Unhandled event type: ${event}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message || 'Webhook handler failed' });
  }
});

// Helper functions
async function handleSubscriptionUpdate(subscription: any) {
  const { id, plan_id, status, current_start, current_end, notes } = subscription;
  const tenantId = notes?.tenant_id;

  if (!tenantId) {
    console.error('Missing tenant_id in subscription notes');
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        tenant_id: tenantId,
        razorpay_subscription_id: id,
        plan_id,
        status,
        current_period_start: current_start ? new Date(current_start * 1000).toISOString() : null,
        current_period_end: current_end ? new Date(current_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    );

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('razorpay_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

export default router;
