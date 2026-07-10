import { Layers, Trash2 } from 'lucide-react';

function EmptyState() {
  return (
    <div className="p-8 text-center text-slate-500 text-xs italic">
      No sheet selected. Select a sheet above.
    </div>
  );
}

function SheetRow({ sheet, onDelete, disabled }) {
  return (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-800/10 transition-colors">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-teal-950 border border-teal-800 text-teal-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono">
            Tab Linked
          </span>
          <h4 className="text-xs font-bold text-slate-200">
            Title:{' '}
            <span className="text-teal-400 font-mono">{sheet.subsheetName}</span>
          </h4>
        </div>
      </div>
      <button
        onClick={() => onDelete(sheet.id)}
        disabled={disabled}
        className="p-2 text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/20 rounded-xl border border-transparent hover:border-rose-900/60 transition-all"
        aria-label="Disconnect sheet"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function LinkedSheetsList({ linkedSheets, onDelete, syncing }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-400" /> Subsheet Repository
        </span>
      </div>
      <div className="divide-y divide-slate-800/50">
        {linkedSheets.length === 0 ? (
          <EmptyState />
        ) : (
          linkedSheets.map((sheet) => (
            <SheetRow key={sheet.id} sheet={sheet} onDelete={onDelete} disabled={syncing} />
          ))
        )}
      </div>
    </div>
  );
}
