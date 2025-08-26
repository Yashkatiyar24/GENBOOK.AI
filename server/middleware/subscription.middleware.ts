import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { getTenantPlan, type Plan } from '../utils/feature-gating.js';

/**
 * Middleware to require an active subscription and optionally restrict to allowed plans.
 * - Ensures tenant context exists (set by tenantMiddleware).
 * - Checks subscription status in `subscriptions`.
 * - Resolves effective plan via getTenantPlan() and enforces allowed plans if provided.
 * - Returns 402 with upgrade guidance when blocked.
 */
export function requireSubscription(allowedPlans: Plan[] = ['starter', 'professional', 'enterprise']) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId as string | undefined;
      if (!tenantId) return res.status(401).json({ error: 'Tenant context missing' });

      // Load current subscription row
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan, current_period_end')
        .eq('tenant_id', tenantId)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        // Unknown DB error
        return res.status(500).json({ error: 'Failed to read subscription' });
      }

      const status = (data?.status || '').toString();
      const periodEndISO = (data?.current_period_end as string | null) || null;

      // Treat these as not active for feature access
      const inactiveStatuses = new Set(['canceled', 'cancelled', 'unpaid', 'incomplete_expired']);
      let isInactive = status && inactiveStatuses.has(status);

      // Grace period handling for past_due
      if (!isInactive && status === 'past_due') {
        const graceDays = Number(process.env.SUBS_GRACE_DAYS || process.env.RAZORPAY_GRACE_DAYS || 3);
        const now = new Date();
        if (periodEndISO) {
          const end = new Date(periodEndISO);
          const graceUntil = new Date(end.getTime() + graceDays * 24 * 60 * 60 * 1000);
          if (now > graceUntil) {
            isInactive = true;
          }
        } else {
          // No period end known; be conservative after grace days from now
          const graceUntil = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
          if (now > graceUntil) {
            isInactive = true;
          }
        }
      }

      // Resolve effective plan using existing helper (maps status+plan -> Plan)
      const plan = await getTenantPlan(tenantId);

      if (!allowedPlans.includes(plan)) {
        return res.status(402).json({
          error: 'Plan not permitted for this feature',
          plan,
          allowedPlans,
          message: 'Please upgrade your plan to access this feature.',
        });
      }

      if (isInactive) {
        return res.status(402).json({
          error: 'Subscription inactive',
          status,
          message: 'Please update billing to continue using this feature.',
        });
      }

      // OK
      return next();
    } catch (err) {
      console.error('requireSubscription error', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
