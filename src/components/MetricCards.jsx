import React from 'react';

export function MetricCards({ historicalStats, liveHoldingsStats }) {
  // Zone A: Timeframe-Bound Historical Realized Trading Metrics
  const performanceItems = [
    {
      label: 'Realized P/L',
      value: `₹${historicalStats.realized.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      colorClass: historicalStats.realized >= 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      label: '% Realized P/L',
      value: `${historicalStats.pctRealized.toFixed(2)}%`,
      colorClass: historicalStats.realized >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    {
      label: 'Win Ratio',
      value: `${historicalStats.winRatio.toFixed(1)}%`,
      colorClass: 'text-amber-400',
    },
    {
      label: 'Risk/Reward',
      value: historicalStats.riskReward,
      colorClass: 'text-indigo-400',
    },
  ];

  // Zone B: Cumulative Live Open Portfolio Risk (Ignores Timeframe, Syncs with Demat Filters)
  const openExposureItems = [
    {
      label: 'Unrealized P/L',
      value: `₹${liveHoldingsStats.unrealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      colorClass: liveHoldingsStats.unrealized >= 0 ? 'text-teal-400' : 'text-rose-400',
    },
    {
      label: '% Unrealized P/L',
      value: `${liveHoldingsStats.pctUnrealized.toFixed(2)}%`,
      colorClass: liveHoldingsStats.unrealized >= 0 ? 'text-teal-500' : 'text-rose-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Historical Track Row */}
      <div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">
          Closed Performance Summary
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {performanceItems.map((item, index) => (
            <div
              key={index}
              className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-center shadow-inner"
            >
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                {item.label}
              </span>
              <span className={`text-xs font-bold font-mono mt-1 block ${item.colorClass}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Persistent Live Holding Row */}
      <div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">
          Open Trades (All-Time Cumulative)
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {openExposureItems.map((item, index) => (
            <div
              key={index}
              className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg text-center shadow-md"
            >
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                {item.label}
              </span>
              <span className={`text-xs font-bold font-mono mt-1 block ${item.colorClass}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
