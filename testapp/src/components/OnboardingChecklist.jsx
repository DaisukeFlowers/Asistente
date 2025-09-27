import React from 'react';

// Simple client-side onboarding checklist placeholder
export function OnboardingChecklist({ items = [], onToggle }) {
  if (!items.length) return null;
  return (
    <div className="border border-slate-200 rounded-md p-4 bg-white/80">
      <h3 className="text-sm font-semibold mb-3 text-slate-700 tracking-wide">Getting Started</h3>
      <ul className="space-y-2 text-sm">
        {items.map(it => (
          <li key={it.id} className="flex items-start gap-3">
            <button
              aria-pressed={it.done}
              onClick={() => onToggle?.(it.id)}
              className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center text-[10px] font-bold transition ${it.done ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-500 hover:border-brand-500'}`}
            >{it.done ? '✓' : ''}</button>
            <span className={it.done ? 'line-through text-slate-400' : ''}>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}