import React, { useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../../supabase';

interface Props {
  user: SupabaseUser | null;
  onDone: () => void;
}

export default function GetStartedSheet({ user, onDone }: Props) {
  if (!user) {
    return <SignupForm onSuccess={onDone} />;
  }
  return <OnboardingWizard onFinish={onDone} />;
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    // If email confirmation is enabled, we can still close and prompt user
    onSuccess();
    alert('Sign up successful. Please check your email to confirm your account.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-black shadow-md hover:shadow-cyan-500/30 transition disabled:opacity-60"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}

function OnboardingWizard({ onFinish }: { onFinish: () => void }) {
  const steps = ['Business Info', 'Availability', 'Calendar Connection', 'Team Members'] as const;
  type Step = typeof steps[number];
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = steps[stepIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-blue-200">{step}</h4>
        <p className="text-xs text-gray-400">Step {stepIndex + 1} of {steps.length}</p>
      </div>

      {step === 'Business Info' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Company Name" placeholder="Acme Inc." />
          <Input label="Industry" placeholder="Healthcare" />
          <Input label="Website" placeholder="https://example.com" className="md:col-span-2" />
        </div>
      )}

      {step === 'Availability' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Timezone" placeholder="UTC+05:30" />
          <Input label="Working Hours" placeholder="09:00 - 18:00" />
        </div>
      )}

      {step === 'Calendar Connection' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-300">Connect your calendar provider</p>
          <div className="flex gap-3">
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10">Google Calendar</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10">Outlook</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10">iCloud</button>
          </div>
        </div>
      )}

      {step === 'Team Members' && (
        <div className="space-y-3">
          <Input label="Invite by Email" placeholder="teammate@company.com" />
          <p className="text-xs text-gray-400">We’ll send invitations to join your workspace.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50"
        >
          Back
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-black shadow-md hover:shadow-cyan-500/30"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 text-sm font-medium text-black shadow-md hover:shadow-emerald-500/30"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

function Input({ label, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-300 mb-1">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      />
    </div>
  );
}
