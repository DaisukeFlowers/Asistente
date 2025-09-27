import React from 'react';
// Icons can be swapped with a dedicated library (e.g., Heroicons) without altering semantics.

/**
 * FeatureCard
 * Reusable card for marketing features.
 * Replace icon div with actual SVG/icon component (e.g., Heroicons, Lucide) later.
 * Customize brand accent via Tailwind color classes.
 */
export function FeatureCard({ icon, title, children }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-cyan-600 text-white shadow ring-1 ring-white/40">
        {icon ? icon : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l3 3" />
          </svg>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_30%_20%,rgba(29,78,216,0.12),transparent_65%)]" />
    </div>
  );
}
