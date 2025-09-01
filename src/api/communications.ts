import { supabase } from '../supabase';

// Prefer explicit backend base, else API base, else relative path
const BACKEND = (import.meta.env as any).VITE_BACKEND_URL as string | undefined;
export const API_BASE: string = BACKEND
  ? `${BACKEND.replace(/\/$/, '')}/api/v1`
  : ((import.meta.env as any).VITE_API_BASE as string | undefined) || '/api/v1';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export type Conversation = {
  id: string;
  title?: string;
  type?: 'care' | 'billing' | 'general';
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  body?: string;
  attachment_urls?: string[];
  created_at: string;
};

export async function listConversations(params?: { participant_user_id?: string; participant_contact_id?: string }) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const q = new URLSearchParams();
  if (params?.participant_user_id) q.set('participant_user_id', params.participant_user_id);
  if (params?.participant_contact_id) q.set('participant_contact_id', params.participant_contact_id);
  const res = await fetch(`${API_BASE}/comm/conversations?${q.toString()}`, { headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j?.error || j?.message || message;
      } else {
        const t = await res.text();
        // Trim long HTML pages
        message = (t || message).slice(0, 200);
      }
    } catch {}
    // Helpful hint for common misconfig
    if (res.status === 404) {
      message += ' – Communications API not found. Set VITE_BACKEND_URL (or VITE_API_BASE) to your backend base URL.';
    }
    throw new Error(message);
  }
  return res.json() as Promise<Conversation[]>;
}

export async function createConversation(input: { title?: string; type?: 'care'|'billing'|'general'; participant_user_ids?: string[]; participant_contact_ids?: string[] }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/comm/conversations`, { method: 'POST', headers, body: JSON.stringify(input) });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j?.error || j?.message || message;
      } else {
        const t = await res.text();
        message = (t || message).slice(0, 200);
      }
    } catch {}
    if (res.status === 404) {
      message += ' – Communications API not found. Set VITE_BACKEND_URL (or VITE_API_BASE).';
    }
    throw new Error(message);
  }
  return res.json() as Promise<Conversation>;
}

export async function listMessages(conversationId: string) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/comm/conversations/${conversationId}/messages`, { headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j?.error || j?.message || message;
      } else {
        const t = await res.text();
        message = (t || message).slice(0, 200);
      }
    } catch {}
    if (res.status === 404) {
      message += ' – Communications API not found. Set VITE_BACKEND_URL (or VITE_API_BASE).';
    }
    throw new Error(message);
  }
  return res.json() as Promise<Message[]>;
}

export async function sendMessage(conversationId: string, body: string, attachment_urls: string[] = []) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/comm/conversations/${conversationId}/messages`, { method: 'POST', headers, body: JSON.stringify({ body, attachment_urls }) });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j?.error || j?.message || message;
      } else {
        const t = await res.text();
        message = (t || message).slice(0, 200);
      }
    } catch {}
    if (res.status === 404) {
      message += ' – Communications API not found. Set VITE_BACKEND_URL (or VITE_API_BASE).';
    }
    throw new Error(message);
  }
  return res.json() as Promise<Message>;
}

export async function markRead(conversationId: string) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/comm/conversations/${conversationId}/read`, { method: 'POST', headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j?.error || j?.message || message;
      } else {
        const t = await res.text();
        message = (t || message).slice(0, 200);
      }
    } catch {}
    if (res.status === 404) {
      message += ' – Communications API not found. Set VITE_BACKEND_URL (or VITE_API_BASE).';
    }
    throw new Error(message);
  }
  return res.json();
}
