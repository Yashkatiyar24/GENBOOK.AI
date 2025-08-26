import React from 'react';

interface FooterCTAProps {
  onGetStarted: () => void;
  onSupport: () => void;
  onContact: () => void;
}

export default function FooterCTA({ onGetStarted, onSupport, onContact }: FooterCTAProps) {
  return (
    <footer className="mt-12 border-t border-white/10 bg-gradient-to-t from-black/40 to-transparent">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-gray-300 text-sm">Have questions or ready to begin? We're here to help.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onGetStarted}
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-black shadow-md hover:shadow-cyan-500/30 transition"
            >
              Get Started
            </button>
            <button
              onClick={onSupport}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 transition"
            >
              Support
            </button>
            <button
              onClick={onContact}
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20 transition"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
