import React, { useMemo, useState } from 'react';

const KB_DATA = [
  { q: 'How to connect Google Calendar?', a: 'Go to Settings > Integrations and click Connect next to Google Calendar.' },
  { q: 'Invite team members', a: 'Navigate to Organization > Team and use the Invite button to add members by email.' },
  { q: 'Configure availability', a: 'Open Settings > Scheduling to set working hours, buffer, and time zone.' },
];

export default function SupportSheet() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KB_DATA;
    return KB_DATA.filter(item => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-xs text-gray-300">Search Knowledge Base</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      <div className="space-y-3">
        {results.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-medium text-white">{item.q}</p>
            <p className="mt-1 text-xs text-gray-300">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-black">Open Live Chat</button>
        <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200">Submit a Ticket</button>
      </div>

      <form className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium text-blue-200">Quick Ticket</p>
        <div>
          <label className="mb-1 block text-xs text-gray-300">Subject</label>
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100" placeholder="Issue summary" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-300">Details</label>
          <textarea className="min-h-[96px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100" placeholder="Describe the issue..." />
        </div>
        <button type="button" className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-black">Send</button>
      </form>
    </div>
  );
}
