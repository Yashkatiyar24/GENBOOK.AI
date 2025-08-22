export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function computeBillingUrl(): string {
  const origin = window.location.origin;
  // App uses hash-based navigation (#/billing), prefer that route
  return `${origin}/#/billing`;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });

  if (res.status === 402) {
    try {
      const payload = await (async () => { try { return await res.json(); } catch { return {}; } })();
      localStorage.setItem('upgrade_reason', payload?.error || payload?.message || 'Plan required or usage limit reached.');
    } catch {
      localStorage.setItem('upgrade_reason', 'Plan required or usage limit reached.');
    }
    // Redirect to Billing
    const billingUrl = computeBillingUrl();
    // avoid redirect loop: don’t redirect if we are already there
    if (!location.href.includes('/#/billing') && !location.pathname.startsWith('/billing')) {
      location.href = billingUrl;
    }
    // Also throw to allow callers to handle gracefully
    throw new ApiError('Payment Required (402)', 402);
  }

  if (!res.ok) {
    let body: any = undefined;
    try { body = await res.json(); } catch {}
    throw new ApiError(body?.error || body?.message || `Request failed (${res.status})`, res.status, body);
  }

  return res;
}

export async function apiJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await apiFetch(input, init);
  return res.json() as Promise<T>;
}
