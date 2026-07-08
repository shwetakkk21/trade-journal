import React, { useState, useEffect } from 'react';
import { getTodayString } from '../utils/dateUtils';
import { availableQty } from '../utils/tradeEngine';

export function ManualTradeModal({
  isOpen,
  onClose,
  onSubmit,
  dematOptions,
  editTx,
  portfolio,
}) {
  if (!isOpen) return null;

  const validAccounts = (dematOptions || []).filter((d) => d !== 'ALL');

  const [tradeType, setTradeType] = useState('BUY');
  const [symbol, setSymbol] = useState('');
  const [demat, setDemat] = useState(validAccounts[0] || '');
  const [strategy, setStrategy] = useState('Unassigned');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [customDate, setCustomDate] = useState(getTodayString());
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    if (editTx) {
      setTradeType(editTx.type);
      setSymbol(editTx.symbol);
      setDemat(editTx.demat);
      setStrategy(editTx.strategy || 'Unassigned');
      setQty(String(editTx.qty));
      setPrice(String(editTx.price));
      setCustomDate(editTx.date || getTodayString());
    } else {
      setTradeType('BUY');
      setSymbol('');
      setDemat(validAccounts[0] || '');
      setStrategy('Unassigned');
      setQty('');
      setPrice('');
      setCustomDate(getTodayString());
    }
    setInlineError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTx, isOpen]);

  const cleanSymbol = symbol.toUpperCase().trim();
  const parsedQty = parseFloat(qty) || 0;
  const openQty =
    tradeType === 'SELL' && cleanSymbol && demat
      ? availableQty(portfolio || [], cleanSymbol, demat)
      : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setInlineError('');
    if (!cleanSymbol || !qty || !price) return;

    if (tradeType === 'SELL' && parsedQty > (openQty || 0)) {
      setInlineError(
        `Only ${openQty || 0} share(s) of ${cleanSymbol} available in ${demat}.`
      );
      return;
    }

    onSubmit({
      type: tradeType,
      symbol: cleanSymbol,
      demat,
      strategy: strategy.trim(),
      qty: parsedQty,
      price: parseFloat(price),
      date: customDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-5">
          <h3 className="font-bold text-base text-white">
            {editTx ? 'Modify Transaction' : 'Execute Manual Entry'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm p-1">✕</button>
        </div>

        {!editTx && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-5">
            <button
              type="button"
              onClick={() => setTradeType('BUY')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeType === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setTradeType('SELL')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeType === 'SELL' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              SELL
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Stock Symbol</label>
              <input
                required
                type="text"
                disabled={!!editTx}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-teal-500 uppercase disabled:opacity-50"
                placeholder="RELIANCE"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Demat</label>
              <select
                value={demat}
                onChange={(e) => setDemat(e.target.value)}
                disabled={!!editTx}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-50"
              >
                {validAccounts.length === 0 ? (
                  <option value="None">None</option>
                ) : (
                  validAccounts.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Strategy</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-950/40 p-4 border border-slate-800/60 rounded-xl">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Execution Date</label>
              <input
                required
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Quantity</label>
              <input
                required
                type="number"
                min="0.00001"
                step="any"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              {tradeType === 'SELL' && openQty !== null && (
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  Available: <span className={parsedQty > openQty ? 'text-rose-400' : 'text-emerald-400'}>{openQty}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                {tradeType === 'BUY' ? 'Buy Price (₹)' : 'Sell Price (₹)'}
              </label>
              <input
                required
                type="number"
                min="0.00001"
                step="any"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {inlineError && (
            <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
              {inlineError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-800/80 mt-2">
            <button type="button" onClick={onClose} className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2 rounded-lg transition-all">
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 text-slate-950 font-bold text-xs py-2 rounded-lg shadow-md transition-all ${tradeType === 'BUY' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}
            >
              {editTx ? 'Commit Changes' : tradeType === 'BUY' ? 'Confirm Buy' : 'Confirm Sell'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
