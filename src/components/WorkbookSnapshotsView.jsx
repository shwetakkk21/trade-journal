import React, { useState, useEffect } from 'react';
import { fetchAbsoluteRawSheetData } from '../utils/sheetService';
import { RefreshCw, Table } from 'lucide-react';

export function WorkbookSnapshotsView({ linkedSheets, googleToken }) {
  const [selectedSheet, setSelectedSheet] = useState(linkedSheets[0] || null);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRawData = async (sheet) => {
    if (!sheet || !googleToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAbsoluteRawSheetData(sheet.spreadsheetId, sheet.subsheetName, googleToken);
      setRawRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSheet) loadRawData(selectedSheet);
  }, [selectedSheet]);

  if (linkedSheets.length === 0) return <div className="p-6 text-slate-400">No sheets linked yet.</div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900 p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Tab:</label>
          <select
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
            value={linkedSheets.indexOf(selectedSheet)}
            onChange={(e) => setSelectedSheet(linkedSheets[e.target.value])}
          >
            {linkedSheets.map((sheet, idx) => (
              <option key={sheet.id || idx} value={idx}>{sheet.subsheetName}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => loadRawData(selectedSheet)}
          disabled={loading}
          className="bg-slate-950 hover:bg-slate-800 text-teal-400 px-3 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center gap-2 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Live Cells
        </button>
      </div>

      {error && <div className="p-4 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-400 font-mono">{error}</div>}

      {loading ? (
        <div className="p-20 text-center text-slate-500 text-xs italic">Streaming direct grid matrices from Google...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                  <th className="p-2 border-r border-slate-800/60 text-center bg-slate-950 w-10">#</th>
                  {Array.from({ length: Math.max(...rawRows.map(r => r.length), 1) }).map((_, colIdx) => (
                    <th key={colIdx} className="p-2 border-r border-slate-800/60 text-slate-400 uppercase tracking-wider text-[11px]">
                      {String.fromCharCode(65 + colIdx)} {/* Generates A, B, C, D... */}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {rawRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-800/20 transition-colors odd:bg-slate-900/40">
                    <td className="p-2 border-r border-slate-800/60 bg-slate-950/60 text-slate-600 font-bold text-center select-none w-10">
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="p-2 border-r border-slate-800/60 text-slate-300 max-w-[200px] truncate whitespace-nowrap">
                        {cell === '' ? <span className="text-slate-700 font-sans italic">empty</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}