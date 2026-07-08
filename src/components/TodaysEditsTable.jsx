import React from 'react';

export function TodaysEditsTable({ transactions, onEdit, onDelete }) {
  const fmt = (n, d = 2) =>
    n === '' || n === null || n === undefined || Number.isNaN(Number(n))
      ? '—'
      : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden mt-6">
      <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Today's Transactions
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            
          </p>
        </div>
        <span className="bg-teal-950/60 border border-teal-800/60 text-teal-400 px-2 py-0.5 rounded text-[10px] font-bold">
          {transactions.length} Executions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <th className="p-2">Symbol</th>
              <th className="p-2">Demat</th>
              <th className="p-2 text-center">Action</th>
              <th className="p-2 text-center">Trade Date</th>
              <th className="p-2 text-right">Trade Price</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Trade Value</th>
              <th className="p-2 text-center">Modify</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="12" className="p-8 text-center text-slate-500 italic">
                  No transactions submitted yet today.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isSell = tx.type === 'SELL';
                // For a SELL we don't know the original buy price from the
                // input alone (LIFO consumes lots), so we display "—" and rely
                // on the sheet for the realised P/L.
                const tradeDate=tx.date;
                const tradePrice = tx.price;
                const qty = Number(tx.qty) || 0;
                const tradeValue = qty * Number(tx.price || 0);

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2 font-semibold text-teal-400">{tx.symbol}</td>
                    <td className="p-2">
                      <span className="bg-slate-950 px-2 py-0.5 rounded text-[10px] border border-slate-800 text-slate-300">
                        {tx.demat}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isSell
                            ? 'bg-rose-950/40 border-rose-800 text-rose-400'
                            : 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-2 text-center text-slate-400 font-mono">{tradeDate || '—'}</td>
                    <td className="p-2 text-right font-mono text-slate-300">{fmt(tradePrice)}</td>
                    <td className="p-2 text-right font-mono text-slate-300">{qty.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono text-slate-400">{fmt(tradeValue)}</td>
                    <td className="p-2 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(tx)}
                          className="text-teal-400 hover:text-white text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(tx)}
                          className="text-slate-500 hover:text-rose-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}