import React, { useState } from 'react';

export function DataIngestion({ onImport, onOpenManualModal }) {
  const [inputText, setInputText] = useState('');
  const [targetDemat, setTargetDemat] = useState('Zerodha');

  const triggerImport = (mode) => {
    if (!inputText.trim()) return;
    onImport(inputText, targetDemat, mode);
    setInputText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Data Inputs Area</h2>
          {/* Moved the manual creation button here for better UX grouping */}
          <button
            onClick={onOpenManualModal}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
          >
            + Add Single Row
          </button>
        </div>

        <div className="mb-3">
          <label className="text-[11px] uppercase text-slate-400 tracking-wider font-semibold block mb-1">
            Target Demat Account (Subsheet)
          </label>
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
            value={targetDemat}
            onChange={(e) => setTargetDemat(e.target.value)}
            placeholder="e.g. Zerodha, Groww"
          />
        </div>

        <textarea
          className="w-full h-24 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-500 focus:outline-none focus:border-teal-500"
          placeholder="Or paste raw text block columns from sheets here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => triggerImport('APPEND')}
          className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium text-xs py-2 rounded-lg transition-all"
        >
          Add Uniquely
        </button>
        <button
          onClick={() => triggerImport('OVERWRITE')}
          className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all shadow-md"
        >
          Overwrite Demat
        </button>
      </div>
    </div>
  );
}
