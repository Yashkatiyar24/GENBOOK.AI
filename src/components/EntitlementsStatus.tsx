import { useEffect, useState } from 'react';
import { fetchEntitlements, Entitlements } from '../utils/entitlements';

function planColor(plan: string) {
  switch (plan) {
    case 'enterprise': return 'from-amber-300 to-yellow-400 text-black';
    case 'pro': return 'from-cyan-400 to-blue-500 text-black';
    default: return 'from-gray-400 to-gray-500 text-black';
  }
}

export default function EntitlementsStatus() {
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchEntitlements();
        if (!mounted) return;
        setEnts(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-3">
        <div className="h-3 w-24 bg-black/30 rounded-full overflow-hidden">
          <div className="h-full w-8 animate-pulse bg-cyan-500/40" />
        </div>
        <div className="px-2 py-1 text-xs rounded-md bg-black/30 border border-cyan-500/20 text-gray-300">Loading</div>
      </div>
    );
  }

  if (!ents) return null;

  // Usage: prefer appointments per month if present
  const total = ents.limits?.appointments_per_month ?? 0;
  const used = ents.usage?.appointments_this_month ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div className="hidden md:flex items-center gap-4">
      {/* Plan badge */}
      <div className={`text-xs font-semibold px-2.5 py-1 rounded-md bg-gradient-to-r ${planColor(ents.plan)} border border-white/10 shadow`}
           title={`Plan: ${ents.plan}`}
      >
        {ents.plan.toUpperCase()}
      </div>

      {/* Usage bar */}
      {total > 0 && (
        <div className="flex items-center gap-2 min-w-[180px]" title={`Usage: ${used}/${total}`}>
          <div className="w-36 h-2.5 bg-black/30 border border-cyan-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-gray-300 tabular-nums">{used}/{total}</div>
        </div>
      )}

      <a href="#/billing" className="text-xs px-2.5 py-1 border border-cyan-500/30 hover:border-cyan-400/60 rounded-md bg-black/20 hover:bg-black/30 transition-colors">
        Manage Plan
      </a>
    </div>
  );
}
