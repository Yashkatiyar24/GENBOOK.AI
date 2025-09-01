export type Entitlements = {
  plan: 'free' | 'pro' | 'enterprise';
  status: string | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  usage: Record<string, number>;
};

let cache: { data: Entitlements | null; ts: number } = { data: null, ts: 0 };
const TTL_MS = 30_000; // 30s cache to avoid chatty calls

export async function fetchEntitlements(force = false): Promise<Entitlements> {
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < TTL_MS) return cache.data;
  const { apiJson } = await import('./api');
  const apiBase = (import.meta as any)?.env?.VITE_BACKEND_URL ? String((import.meta as any).env.VITE_BACKEND_URL).replace(/\/$/, '') : '';
  // Use versioned API path to match server routes and avoid adblock heuristics on '/api/tenants/*'
  const data = (await apiJson<Entitlements>(`${apiBase}/api/v1/tenants/current`, { credentials: 'include' as any })) as Entitlements;
  cache = { data, ts: now };
  return data;
}

export function isEntitled(entitlements: Entitlements | null | undefined, key: string): boolean {
  if (!entitlements) return false;
  return Boolean(entitlements.features?.[key]);
}
