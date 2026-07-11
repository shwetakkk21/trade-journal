import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const POSITIVE_COLOR = '#34d399'; // emerald 
const NEGATIVE_COLOR = '#f43f5e'; // rose 

const METRICS = [
  {
    id: 'pl',
    label: 'P/L',
    dataKey: 'pl',
    color: POSITIVE_COLOR,
    divergent: true, 
    format: (v) => `₹${Number(v).toFixed(2)}`,
  },
  {
    id: 'pctPl',
    label: '% P/L',
    dataKey: 'pctPl',
    color: POSITIVE_COLOR,
    divergent: true,
    format: (v) => `${Number(v).toFixed(2)}%`,
  },
  {
    id: 'winRatio',
    label: 'Win Ratio',
    dataKey: 'winRatio',
    color: '#fbbf24',
    divergent: false, 
    format: (v) => `${Number(v).toFixed(1)}%`,
  },
  {
    id: 'riskReward',
    label: 'RR Ratio',
    dataKey: 'riskReward',
    color: '#a78bfa',
    divergent: false, 
    format: (v) => `${Number(v).toFixed(2)}x`,
  }
];

export function TrendChart({ trendData }) {
  const [activeMetricId, setActiveMetricId] = useState('pl');
  const metric = METRICS.find((m) => m.id === activeMetricId) || METRICS[0];
  const gradientId = `trend-line-split-${metric.id}`;

  const values = useMemo(
    () =>
      Array.isArray(trendData)
        ? trendData
            .map((d) => d[metric.dataKey])
            .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
        : [],
    [trendData, metric.dataKey]
  );

  const hasPlottablePoints = values.length > 0;

  const { yDomain, zeroOffset } = useMemo(() => {
    if (!metric.divergent || values.length === 0) {
      return { yDomain: ['auto', 'auto'], zeroOffset: null };
    }
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    let offset;
    if (dataMax <= 0) offset = 0; // entirely negative -> all red
    else if (dataMin >= 0) offset = 1; // entirely positive -> all green
    else offset = Math.min(1, Math.max(0, dataMax / (dataMax - dataMin)));

    const domainMin = Math.min(dataMin, 0);
    const domainMax = Math.max(dataMax, 0);
    const span = domainMax - domainMin;
    const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(domainMax), 1) * 0.1;

    return { yDomain: [domainMin - pad, domainMax + pad], zeroOffset: offset };
  }, [metric.divergent, values]);

  const renderDot = (props) => {
    const { cx, cy, value, index } = props;
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    const fill = metric.divergent ? (value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR) : metric.color;
    return <circle key={`dot-${metric.id}-${index}`} cx={cx} cy={cy} r={2.5} fill={fill} stroke="none" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Day-on-Day Performance Trend
          </h3>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 gap-1 shrink-0">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMetricId(m.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap ${
                activeMetricId === m.id
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {!hasPlottablePoints ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs italic text-center px-6">
            No closed trade history available yet to chart a {metric.label} trend for this
            filtered selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              {metric.divergent && zeroOffset !== null && (
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset={0} stopColor={POSITIVE_COLOR} />
                    <stop offset={zeroOffset} stopColor={POSITIVE_COLOR} />
                    <stop offset={zeroOffset} stopColor={NEGATIVE_COLOR} />
                    <stop offset={1} stopColor={NEGATIVE_COLOR} />
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} minTickGap={20} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={yDomain} tickFormatter={(v)=>Number(v).toFixed(2)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                }}
                itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                labelStyle={{ color: '#f8fafc' }}
                formatter={(value) => [metric.format(value), metric.label]}
                labelFormatter={(label, payload) =>
                  payload && payload[0] ? payload[0].payload.date : label
                }
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <Line
                type="monotone"
                dataKey={metric.dataKey}
                stroke={metric.divergent ? `url(#${gradientId})` : metric.color}
                strokeWidth={2}
                dot={renderDot}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
