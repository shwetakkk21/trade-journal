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
import { TrendChart } from './TrendChart';

export function AnalyticsCharts({ chartData, trendData }) {
  const hasSymbolCharts = Array.isArray(chartData) && chartData.length > 0;
  const hasTrendData = Array.isArray(trendData) && trendData.length > 0;
  
  if (!hasSymbolCharts && !hasTrendData) return null;

  const realizedChartData = hasSymbolCharts ? chartData.filter((item) => item.Realized !== 0) : [];
  const unrealizedChartData = hasSymbolCharts ? chartData.filter((item) => item.Unrealized !== 0) : [];

  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    return Number(value).toFixed(2);
  };

  return (
    <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 sm:p-6 mb-8 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-slate-200 font-sans">Performance Analytics</h2>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          Trend and symbol-level breakdown, filtered by the selections above.
        </p>
      </div>

      {/*Day-on-day trend across the 4 core metrics*/}
      <TrendChart trendData={trendData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/*Realized P/L Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Realized Portfolio
          </h3>
          <div className="h-64">
            {realizedChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs italic">
                No closed trade history available yet to chart this filtered selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={realizedChartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={formatValue}
                  />
                  
                  <Tooltip
                    formatter={(value) => [formatValue(value), 'Realized P/L']}
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

        {/* Unrealized Exposure Risk*/}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Unrealized Portfolio (All-Time Cumulative)
          </h3>
          <div className="h-64">
            {unrealizedChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs italic">
                No open assets available yet to chart this filtered selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={unrealizedChartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={formatValue}
                  />
                  
                  <Tooltip
                    formatter={(value) => [formatValue(value), 'Unrealized P/L']}
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
    </div>
  );
}