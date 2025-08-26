import { supabase } from '../supabase';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export type RecurrenceRule = {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  count?: number; // number of occurrences
  days_of_week?: number[]; // 0-6 if weekly
};

export async function createSeries(series: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/recurring/series`, {
    method: 'POST',
    headers,
    body: JSON.stringify(series),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function expandSeries(seriesId: string, instances: Array<{ start_time: string; end_time: string; title?: string; description?: string }>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/recurring/series/${seriesId}/expand`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ instances }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listAttendees(appointmentId: string) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/attendees`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addAttendee(appointmentId: string, contact_id: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/attendees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contact_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeAttendee(appointmentId: string, contactId: string) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/attendees/${contactId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createWaitlistEntry(entry: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/waitlist`, {
    method: 'POST',
    headers,
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function promoteWaitlist(id: string) {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${API_BASE}/waitlist/${id}/promote`, { method: 'POST', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
