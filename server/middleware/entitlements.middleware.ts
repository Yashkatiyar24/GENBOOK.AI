import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

// Feature keys used across the app
export type FeatureKey = 'custom_branding' | 'advanced_analytics' | 'api_access' | 'priority_support';

function planToFeatures(plan: string): Record<FeatureKey, boolean> {
  const p = (plan || 'free').toLowerCase();
  if (p.includes('enterprise')) {
    return { custom_branding: true, advanced_analytics: true, api_access: true, priority_support: true };
  }
  if (p.includes('pro') || p.includes('professional')) {
    return { custom_branding: true, advanced_analytics: false, api_access: false, priority_support: true };
  }
  return { custom_branding: false, advanced_analytics: false, api_access: false, priority_support: false };
}

async function getTenantPlan(tenantId: string): Promise<{ plan: string; status: string | null }> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('tenant_id', tenantId)
    .single();
  return { plan: (data?.plan as string) || 'free', status: (data?.status as string) || null };
}

export function requireEntitlement(featureKey: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId as string | undefined;
      if (!tenantId) return res.status(401).json({ error: 'Missing tenant context' });

      const { plan, status } = await getTenantPlan(tenantId);
      const features = planToFeatures(plan);
      if (!features[featureKey]) {
        return res.status(402).json({
          error: 'Feature not available on current plan',
          feature: featureKey,
          plan,
          status,
          message: 'Please upgrade your plan to access this feature.'
        });
      }

      return next();
    } catch (err: any) {
      console.error('requireEntitlement error', err);
      return res.status(500).json({ error: 'Failed to verify entitlement' });
    }
  };
}
