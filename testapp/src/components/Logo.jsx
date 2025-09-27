import React from 'react';

// Simple placeholder logo (text + subtle accent). Replace SVG/content with branded asset later.
export function Logo({ className = 'flex items-center gap-2 font-semibold text-slate-800' }) {
  return (
    <div className={className} aria-label="Schedulink logo">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 text-white text-sm font-bold shadow-sm">S</span>
      <span className="text-lg tracking-tight">Schedulink</span>
    </div>
  );
}
