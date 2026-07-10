import React, { useEffect, useState } from 'react';
import { parseCsvText, groupOrdersFifo } from '../utils/csvImport';

export function CsvImportModal({ isOpen, onClose, dematOptions, onExecute }) {
  const [demat, setDemat] = useState(dematOptions[0] || '');
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState(null); // { fillCount, orders, warnings }
  const [parseError, setParseError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDemat(dematOptions[0] || '');
      setFileName('');
      setSummary(null);
      setParseError('');
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSummary(null);
    setParseError('');
    setFileName(file ? file.name : '');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { rows, error } = parseCsvText(String(reader.result || ''));
      if (error) {
        setParseError(error);
        return;
      }
      const { orders, warnings } = groupOrdersFifo(rows);
      if (orders.length === 0) {
        setParseError('No valid orders could be grouped from this file.');
        return;
      }
      setSummary({ fillCount: rows.length, orders, warnings });
    };
    reader.onerror = () => setParseError('Could not read the selected file.');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!summary || !demat || busy) return;
    setBusy(true);
    try {
      await onExecute(demat, summary.orders);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-5">
          <h3 className="font-bold text-base text-white">Import Trade History (CSV)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm p-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Demat Tab
            </label>
            <select
              value={demat}
              onChange={(e) => setDemat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {dematOptions.length === 0 ? (
                <option value="">No linked sheets — link one first</option>
              ) : (
                dematOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Trade History CSV
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-slate-700 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              Fills sharing the same order id are combined into one entry (summed quantity, weighted-average price), then executed against the sheet in FIFO order (earliest execution time first).
            </p>
          </div>

          {parseError && (
            <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
              {parseError}
            </div>
          )}

          {summary && (
            <div className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800/60 rounded-lg px-3 py-2 space-y-1">
              <p>
                Parsed <span className="text-emerald-400 font-semibold">{summary.fillCount}</span> fill(s) from{' '}
                <span className="font-mono">{fileName}</span> →{' '}
                <span className="text-emerald-400 font-semibold">{summary.orders.length}</span> combined order(s) will be written to{' '}
                <span className="font-semibold">{demat || '—'}</span>.
              </p>
              {summary.warnings.length > 0 && (
                <p className="text-amber-400">
                  {summary.warnings.length} order(s) skipped (mixed symbol/side under one order id).
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-800/80 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!summary || !demat || busy}
              onClick={handleImport}
              className="px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-xs py-2 rounded-lg shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Importing…' : 'Import & Execute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
