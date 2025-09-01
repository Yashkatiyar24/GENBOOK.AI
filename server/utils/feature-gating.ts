import { supabase } from '../supabase.js';

export type Metric = 'appointments_month' | 'chat_messages_month' | 'team_members_current';

export type Plan = 'starter' | 'professional' | 'enterprise' | 'unknown';

export const PLAN_LIMITS: Record<Plan, Record<Metric, number | 'unlimited'>> = {
  starter: {
    appointments_month: 50,
    chat_messages_month: 100,
    team_members_current: 1,
  },
  professional: {
    appointments_month: 'unlimited',
    chat_messages_month: 1000,
    team_members_current: 5,
  },
  enterprise: {
    appointments_month: 'unlimited',
    chat_messages_month: 'unlimited',
    team_members_current: Number.MAX_SAFE_INTEGER,
  },
  unknown: {
    appointments_month: 50,
    chat_messages_month: 100,
    team_members_current: 1,
  },
};

export async function getTenantPlan(tenantId: string): Promise<Plan> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('tenant_id', tenantId)
    .single();
  if (!data) return 'starter';
  if (data.status && ['active', 'trialing', 'past_due'].includes(data.status)) {
    const price = (data.plan || '') as string;
    if (price.includes('enterprise')) return 'enterprise';
    if (price.includes('professional') || price.includes('pro')) return 'professional';
    return 'professional';
  }
  return 'starter';
}

function getCurrentMonthWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getUsage(tenantId: string, metric: Metric): Promise<number> {
  const { start, end } = getCurrentMonthWindow();
  const { data, error } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('tenant_id', tenantId)
    .eq('metric', metric)
    .gte('period_start', start)
    .lt('period_end', end)
    .single();
  if (error || !data) return 0;
  return data.count || 0;
}

export async function incrementUsage(tenantId: string, metric: Metric, delta = 1) {
  const { start, end } = getCurrentMonthWindow();
  // Fetch existing
  const { data } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('tenant_id', tenantId)
    .eq('metric', metric)
    .eq('period_start', start)
    .eq('period_end', end)
    .single();
  const next = (data?.count || 0) + delta;
  await supabase
    .from('usage_counters')
    .upsert({ tenant_id: tenantId, metric, period_start: start, period_end: end, count: next }, { onConflict: 'tenant_id,metric,period_start' });
}

async function checkLimit(tenantId: string, metric: Metric): Promise<{ allowed: boolean; limit: number | 'unlimited'; used: number; plan: Plan }>{
  const plan = await getTenantPlan(tenantId);
  const limit = PLAN_LIMITS[plan][metric];
  const used = await getUsage(tenantId, metric);
  if (limit === 'unlimited') return { allowed: true, limit, used, plan };
  return { allowed: used < limit, limit, used, plan };
}

export async function canCreateAppointment(tenantId: string) {
  return checkLimit(tenantId, 'appointments_month');
}

export async function canUseChatbot(tenantId: string) {
  return checkLimit(tenantId, 'chat_messages_month');
}

export async function canInviteMember(tenantId: string) {
  const plan = await getTenantPlan(tenantId);
  const limit = PLAN_LIMITS[plan]['team_members_current'];
  // Count current members
  const { data, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  const used = (data as unknown as { count?: number } | null)?.count || 0;
  if (typeof limit === 'number') return { allowed: used < limit, limit, used, plan };
  return { allowed: true, limit, used, plan };
}
