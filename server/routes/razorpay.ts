import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../supabase.js';

const router = express.Router();

// Create Razorpay order
router.post('/order', async (req: Request, res: Response) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(400).json({ error: 'Razorpay not configured' });

    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}`, notes = {} } = req.body || {};
    if (!amount || Number.isNaN(Number(amount))) return res.status(400).json({ error: 'Invalid amount' });
    // Ensure we pass tenant context forward for webhook correlation
    const tenantId = (req as any).tenantId as string | undefined;
    const enrichedNotes = {
      ...notes,
      tenantId: notes?.tenantId || tenantId || 'unknown',
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(Number(amount)), currency, receipt, notes: enrichedNotes }),
    });
    const text = await rpRes.text();
    if (!rpRes.ok) {
      try {
        const j = JSON.parse(text);
        return res.status(rpRes.status).json({ error: j?.error?.description || j?.error || text });
      } catch {
        return res.status(rpRes.status).json({ error: text });
      }
    }
    const data = JSON.parse(text);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create order' });
  }
});

// Create Razorpay subscription
router.post('/subscription', async (req: Request, res: Response) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(400).json({ error: 'Razorpay not configured' });

    const { planId, totalCount = 12, quantity = 1, customerNotify = 1, notes = {} } = req.body || {};
    if (!planId || typeof planId !== 'string') return res.status(400).json({ error: 'planId is required' });

    const tenantId = (req as any).tenantId as string | undefined;
    const enrichedNotes = {
      ...notes,
      tenantId: notes?.tenantId || tenantId || 'unknown',
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rpRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        total_count: Number(totalCount),
        quantity: Number(quantity),
        customer_notify: Number(customerNotify),
        notes: enrichedNotes,
      }),
    });
    const text = await rpRes.text();
    if (!rpRes.ok) {
      try {
        const j = JSON.parse(text);
        return res.status(rpRes.status).json({ error: j?.error?.description || j?.error || text });
      } catch {
        return res.status(rpRes.status).json({ error: text });
      }
    }
    const data = JSON.parse(text);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to create subscription' });
  }
});

// Webhook verification + event mapping
router.post('/webhook', express.raw({ type: '*/*' }), async (req: Request, res: Response) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(400).send('Webhook not configured');

    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) return res.status(400).send('Missing signature');

    const body = req.body as Buffer;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) return res.status(400).send('Invalid signature');

    const text = body.toString('utf8');
    let event: any;
    try {
      event = JSON.parse(text);
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    // Idempotency: compute deterministic event id and record it
    const eventId = crypto.createHash('sha256').update(body).digest('hex');
    try {
      const { error: evtErr } = await supabase
        .from('billing_events')
        .insert({ event_id: eventId, provider: 'razorpay' });
      if (evtErr) {
        // Duplicate event: already processed
        // Postgres unique_violation code
        // @ts-ignore
        if (evtErr.code === '23505') {
          return res.status(200).json({ received: true, duplicate: true });
        }
        throw evtErr;
      }
    } catch (e) {
      // If we cannot ensure idempotency storage, avoid processing to prevent duplicates
      return res.status(500).send('Idempotency check failed');
    }

    const eventType: string = event?.event || '';
    const payload: any = event?.payload || {};

    // Helpers
    const now = () => new Date().toISOString();

    function normalizePlan(raw?: string | null): string {
      const s = (raw || '').toLowerCase();
      if (!s) return 'starter';
      if (s.includes('pro') || s.includes('professional')) return 'professional';
      if (s.includes('enterprise')) return 'enterprise';
      if (s.includes('starter') || s.includes('basic') || s.includes('free')) return 'starter';
      return s; // allow custom plan keys
    }

    function mapStatus(evt: string): { status: string; cancel?: boolean } {
      switch (evt) {
        case 'subscription.activated':
        case 'subscription.authenticated':
        case 'subscription.charged':
          return { status: 'active' };
        case 'payment.failed':
        case 'subscription.pending':
          return { status: 'past_due' };
        case 'subscription.halted':
        case 'subscription.completed':
        case 'subscription.cancelled':
        case 'subscription.paused':
          return { status: 'cancelled', cancel: true };
        default:
          return { status: 'active' };
      }
    }

    async function upsertSubscriptionByTenant(tenantId: string, fields: Record<string, any>) {
      if (!tenantId) return;
      // Upsert by tenant_id
      const { error } = await supabase
        .from('subscriptions')
        .upsert({ tenant_id: tenantId, updated_at: now(), ...fields }, { onConflict: 'tenant_id' });
      if (error) throw error;
    }

    // Extract common info: tenantId, plan, period
    let tenantId: string | undefined;
    let plan: string | undefined;
    let current_period_start: string | undefined;
    let current_period_end: string | undefined;
    let subscriptionId: string | undefined;

    // Try to derive from different payload shapes
    // 1) Subscription events
    const subEntity = payload?.subscription?.entity || payload?.subscription || payload?.subscription_entity;
    if (subEntity) {
      tenantId = subEntity?.notes?.tenantId || subEntity?.notes?.tenant_id;
      plan = normalizePlan(subEntity?.notes?.plan || subEntity?.plan_id || subEntity?.plan?.item?.name);
      subscriptionId = subEntity?.id;
      // Razorpay subscription has current_start and current_end in epoch seconds
      const startSec = subEntity?.current_start || subEntity?.start_at;
      const endSec = subEntity?.current_end || subEntity?.charge_at || subEntity?.end_at;
      if (startSec) current_period_start = new Date(Number(startSec) * 1000).toISOString();
      if (endSec) current_period_end = new Date(Number(endSec) * 1000).toISOString();
    }

    // 2) Payment/order events fall back
    const orderEntity = payload?.order?.entity || payload?.order || payload?.order_entity;
    if (!tenantId && orderEntity) {
      tenantId = orderEntity?.notes?.tenantId || orderEntity?.notes?.tenant_id;
      plan = normalizePlan(plan || orderEntity?.notes?.plan);
    }
    const paymentEntity = payload?.payment?.entity || payload?.payment || payload?.payment_entity;
    if (!tenantId && paymentEntity) {
      tenantId = paymentEntity?.notes?.tenantId || paymentEntity?.notes?.tenant_id;
      plan = normalizePlan(plan || paymentEntity?.notes?.plan);
    }

    if (!tenantId) {
      // Cannot correlate — acknowledge to avoid retries but log for investigation
      console.warn('Razorpay webhook without tenantId in notes');
      return res.status(200).json({ received: true, warning: 'missing-tenant' });
    }

    const { status, cancel } = mapStatus(eventType);

    const fields: any = {
      plan: normalizePlan(plan),
      status,
    };
    if (current_period_start) fields.current_period_start = current_period_start;
    if (current_period_end) fields.current_period_end = current_period_end;
    if (cancel) fields.canceled_at = now();
    // Store gateway subscription id into generic field if available to aid support
    if (subscriptionId) {
      fields.razorpay_subscription_id = subscriptionId;
    }

    await upsertSubscriptionByTenant(tenantId, fields);

    return res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).send('Error handling webhook');
  }
});

// Cancel a Razorpay subscription
router.post('/subscription/:id/cancel', async (req: Request, res: Response) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(400).json({ error: 'Razorpay not configured' });

    const subId = req.params.id;
    const { cancel_at_cycle_end = true } = req.body || {};
    if (!subId) return res.status(400).json({ error: 'subscription id is required' });

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subId)}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_at_cycle_end: !!cancel_at_cycle_end }),
    });
    const text = await rpRes.text();
    if (!rpRes.ok) {
      try {
        const j = JSON.parse(text);
        return res.status(rpRes.status).json({ error: j?.error?.description || j?.error || text });
      } catch {
        return res.status(rpRes.status).json({ error: text });
      }
    }

    // Update our DB subscription status by razorpay_subscription_id
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', canceled_at: now, updated_at: now })
      .eq('razorpay_subscription_id', subId);
    if (error) {
      // Not fatal for client, but reportable
      console.warn('Failed to update local subscription after cancel', error);
    }

    const data = JSON.parse(text);
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to cancel subscription' });
  }
});

export default router;
