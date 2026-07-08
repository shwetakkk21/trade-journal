import React from 'react';
import { CalendarDays, XCircle } from 'lucide-react';

export function TimeframeSelector({
  activeTimeframe,
  onTimeframeChange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) {
  const options = [
    { id: '1DAY', label: '1 Day' },
    { id: '1WEEK', label: '1 Week' },
    { id: '2WEEKS', label: 'Bi-Weekly' },
    { id: '1MONTH', label: 'Monthly' },
    { id: '1QUARTER', label: 'Quarterly' },
    { id: '1YEAR', label: 'Annually' },
    { id: 'CUSTOM', label: 'Custom Period' },
    { id: 'ALL', label: 'All-Time Cumulative' },
  ];

  return (
    <div className="space-y-3 mb-4">
      {/* Original Segmented Control Layout Track */}
      <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 flex flex-wrap gap-1 shadow-inner">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onTimeframeChange(opt.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTimeframe === opt.id
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Inline Date Selector Input Fields Wrapper */}
      {activeTimeframe === 'CUSTOM' && (
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 p-2 rounded-xl max-w-max animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase text-slate-500 pl-1">From</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded-lg p-1 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase text-slate-500">To</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded-lg p-1 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-rose-400 hover:text-rose-300 p-1 transition-all"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
