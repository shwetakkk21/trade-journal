import React from 'react';
import { FolderOpen} from 'lucide-react';

export function AddSheetForm({ newLink, onPickWorkbook, onSubmit, syncing }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
         Pick Your Google Spreadsheet
      </h2>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1.5">File Picker</label>
          <button
            type="button"
            onClick={onPickWorkbook}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-bold rounded-xl p-2.5 flex items-center justify-center gap-2 transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> Browse Google Sheets
          </button>
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1.5">Selected Sheet</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              placeholder="No sheet selected yet"
              value={newLink.spreadsheetName ? `Selected: ${newLink.spreadsheetName}` : ''}
              className="flex-1 bg-slate-950/50 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed focus:outline-none"
            />
            <button
              type="submit"
              disabled={syncing || !newLink.spreadsheetId}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md text-xs uppercase tracking-wider font-sans h-9"
            >
              Link Sheet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}