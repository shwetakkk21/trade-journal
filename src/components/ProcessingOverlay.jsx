import React from 'react';
import { Loader2, Zap, RefreshCw } from 'lucide-react';

export function ProcessingOverlay({
  show,
  variant = 'sync',
  label,
  hint,
}) {
  if (!show) return null;

  const isTransaction = variant === 'transaction';

  const resolvedLabel =
    label || (isTransaction ? 'Submitting Transaction…' : 'Syncing Portfolio…');
  const resolvedHint =
    hint ||
    (isTransaction
      ? 'Writing your trade to the Google Sheet'
      : 'Refreshing latest rows from Google Sheets');

  const themeRing = isTransaction
    ? 'border-amber-700/60 shadow-amber-900/40'
    : 'border-teal-700/60 shadow-teal-900/40';

  const iconTint = isTransaction ? 'text-amber-400' : 'text-teal-400';
  const labelTint = isTransaction ? 'text-amber-100' : 'text-slate-100';
  const dotTint = isTransaction ? 'bg-amber-400' : 'bg-teal-400';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
      <div
        className={`bg-slate-900 border ${themeRing} rounded-2xl px-10 py-7 shadow-2xl flex flex-col items-center gap-3 min-w-[280px]`}
      >
        {isTransaction ? (
          <div className="relative">
            <Zap className={`w-9 h-9 ${iconTint} animate-pulse`} />
            <Loader2 className="w-14 h-14 text-amber-500/30 animate-spin absolute -top-2.5 -left-2.5" />
          </div>
        ) : (
          <RefreshCw className={`w-9 h-9 ${iconTint} animate-spin`} />
        )}

        <p className={`text-sm font-bold uppercase tracking-widest ${labelTint}`}>
          {resolvedLabel}
        </p>
        <p className="text-[11px] text-slate-400 font-mono">{resolvedHint}</p>

        <div className="flex gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dotTint} animate-bounce`} style={{ animationDelay: '0ms' }} />
          <span className={`w-1.5 h-1.5 rounded-full ${dotTint} animate-bounce`} style={{ animationDelay: '150ms' }} />
          <span className={`w-1.5 h-1.5 rounded-full ${dotTint} animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
