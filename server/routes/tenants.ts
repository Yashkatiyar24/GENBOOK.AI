import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// Helper: map plan -> features and limits
function planToEntitlements(plan: string) {
  const p = (plan || 'free').toLowerCase();
  if (p === 'enterprise') {
    return {
      features: { ai_insights: true, voice: true, priority_support: true },
      limits: { appointments_per_month: 10000, ai_requests_per_month: 20000, seats: 100 },
    };
  }
  if (p === 'pro') {
    return {
      features: { ai_insights: true, voice: true, priority_support: false },
      limits: { appointments_per_month: 2000, ai_requests_per_month: 5000, seats: 10 },
    };
  }
  // free
  return {
    features: { ai_insights: false, voice: false, priority_support: false },
    limits: { appointments_per_month: 100, ai_requests_per_month: 200, seats: 2 },
  };
}

router.get('/current', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

    // subscription
    let plan = 'free';
    let status: string | null = null;
    try {
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      if (!subErr && sub) {
        plan = (sub.plan as string) || 'free';
        status = (sub.status as string) || null;
      }
    } catch {}

    const { features, limits } = planToEntitlements(plan);

    // usage
    let usage: Record<string, number> = {};
    try {
      const periodStart = new Date();
      periodStart.setDate(1); // current month start
      const periodISO = periodStart.toISOString().slice(0, 10);
      const { data: usageRows } = await supabase
        .from('usage_counters')
        .select('metric,value')
        .eq('tenant_id', tenantId)
        .eq('period_start', periodISO);
      if (Array.isArray(usageRows)) {
        for (const row of usageRows) usage[row.metric as string] = Number(row.value) || 0;
      }
    } catch {}

    return res.json({ plan, status, features, limits, usage });
  } catch (err: any) {
    console.error('tenants/current error', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch entitlements' });
  }
});

export default router;
