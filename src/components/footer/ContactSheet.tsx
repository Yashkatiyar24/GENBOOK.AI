import React, { useState } from 'react';

export default function ContactSheet() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<'Sales' | 'Partnerships' | 'Press' | 'Feedback'>('Sales');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const base = (import.meta as any).env?.VITE_SERVER_URL || '';
      const res = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, reason, message }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { raw: await res.text() };
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to send');
      setStatus({ ok: true, msg: 'Message sent! We will get back to you shortly.' });
      // clear form
      setName('');
      setEmail('');
      setReason('Sales');
      setMessage('');
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message || 'Something went wrong' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="you@company.com"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-300">Reason for Contact</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as any)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option>Sales</option>
            <option>Partnerships</option>
            <option>Press</option>
            <option>Feedback</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-300">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="min-h-[120px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            placeholder="How can we help?"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-black bg-gradient-to-r from-cyan-400 to-blue-500 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
        {status && (
          <p className={`text-sm ${status.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{status.msg}</p>
        )}
      </form>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
        <p className="font-medium text-blue-200">Business Contact</p>
        <p className="mt-1">Email: <a className="text-cyan-300 hover:underline" href="mailto:helpgenbook@gmail.com">helpgenbook@gmail.com</a></p>
      </div>
    </div>
  );
}
