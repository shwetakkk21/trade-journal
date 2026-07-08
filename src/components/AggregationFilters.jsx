import React from 'react';

export function AggregationFilters({
  selectedDemat,
  setSelectedDemat,
  dematOptions,
  selectedStrategy,
  setSelectedStrategy,
  strategyOptions,
}) {
  return (
    <div className="flex gap-2">
      <select
        value={selectedDemat}
        onChange={(e) => setSelectedDemat(e.target.value)}
        className="bg-slate-950 border border-slate-800 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-teal-500 cursor-pointer"
      >
        {dematOptions.map((d) => (
          <option key={d} value={d}>
            {d === 'ALL' ? 'All Demat Accounts' : `Demat: ${d}`}
          </option>
        ))}
      </select>
      <select
        value={selectedStrategy}
        onChange={(e) => setSelectedStrategy(e.target.value)}
        className="bg-slate-950 border border-slate-800 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-teal-500 cursor-pointer"
      >
        {strategyOptions.map((s) => (
          <option key={s} value={s}>
            {s === 'ALL' ? 'All Strategies' : `Strategy: ${s}`}
          </option>
        ))}
      </select>
    </div>
  );
}
