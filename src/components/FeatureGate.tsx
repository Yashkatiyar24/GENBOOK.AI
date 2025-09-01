import React, { useEffect, useState } from 'react';
import { fetchEntitlements, isEntitled, Entitlements } from '../utils/entitlements';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ featureKey, children, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchEntitlements();
        if (!mounted) return;
        setEnts(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load entitlements');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [featureKey]);

  if (loading) {
    return (
      <div className="p-4 border border-cyan-500/20 rounded-lg bg-black/20 text-gray-300 text-sm">
        Checking your plan...
      </div>
    );
  }

  if (error || !ents || !isEntitled(ents, featureKey)) {
    return (
      <div className="p-6 border border-cyan-500/20 rounded-xl bg-black/30">
        {fallback || (
          <div className="text-center">
            <div className="text-gray-300 mb-2">This feature requires an upgraded plan.</div>
            <a href="/billing" className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium hover:from-cyan-500 hover:to-blue-600">
              Upgrade to unlock
            </a>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
