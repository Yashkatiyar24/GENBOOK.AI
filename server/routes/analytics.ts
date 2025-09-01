import { Router } from 'express';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { requireEntitlement } from '../middleware/entitlements.middleware.js';
import { supabase } from '../supabase.js';

const router = Router();

// All analytics requires an active subscription and the advanced_analytics entitlement
router.use(requireSubscription());
router.use(requireEntitlement('advanced_analytics'));

function getCurrentMonthWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

router.get('/overview', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

    const { start, end } = getCurrentMonthWindow();
    const { data, error } = await supabase
      .from('usage_counters')
      .select('metric,count')
      .eq('tenant_id', tenantId)
      .gte('period_start', start)
      .lt('period_end', end);
    if (error) throw error;

    const usage: Record<string, number> = {};
    for (const row of data || []) usage[row.metric as string] = Number((row as any).count) || 0;

    return res.json({ period_start: start, period_end: end, usage });
  } catch (err: any) {
    console.error('analytics/overview error', err);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
