import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

export function AnalyticsCharts({ chartData }) {
  // If no data exists anywhere across any active parameter, yield rendering gracefully
  if (!chartData || chartData.length === 0) return null;

  // CHART 1 DATA FILTER: Only include items that have real history within the timeframe window
  const realizedChartData = chartData.filter((item) => item.Realized !== 0);

  // CHART 2 DATA FILTER: Only include items that represent live open exposure risk till date
  const unrealizedChartData = chartData.filter((item) => item.Unrealized !== 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* CHART 1: Realized P/L Breakdown (Filters with Timeframe + Dropdowns) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Realized Profit / Loss Breakdown
        </h3>
        <div className="h-64">
          {realizedChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs italic">
              No closed trade performance records discovered inside this isolated timeline.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={realizedChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="Realized">
                  {realizedChartData.map((entry, index) => (
                    <Cell
                      key={`cell-realized-${index}`}
                      fill={entry.Realized >= 0 ? '#34d399' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* CHART 2: Unrealized Exposure Risk (Persistent Till Date, Filters with Dropdowns Only) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Unrealized Portfolio Open Risk (Paper P/L)
        </h3>
        <div className="h-64">
          {unrealizedChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs italic">
              No active open asset investments detected for this filtered profile cross-section.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={unrealizedChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="Unrealized">
                  {unrealizedChartData.map((entry, index) => (
                    <Cell
                      key={`cell-unrealized-${index}`}
                      fill={entry.Unrealized >= 0 ? '#38bdf8' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
