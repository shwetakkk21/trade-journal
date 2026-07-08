import { RefreshCw } from 'lucide-react';

export function SyncActionsPanel({
  googleToken,
  syncing,
  hasLinkedSheets,
  onConnect,
  onSync,
  onOpenManualTrade,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between min-h-[160px]">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Manage Your Sheets</h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {!googleToken
            ? 'Security access key verification missing. Refresh tokens down below.'
            : 'Successfully connected. Sync to view latest data.'}
        </p>
      </div>

      <div className="flex gap-2.5 mt-4">
        {!googleToken ? (
          <button
            onClick={onConnect}
            disabled={syncing}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md uppercase tracking-wider font-sans"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Connect Google Sheets API
          </button>
        ) : (
          <>
            <button
              onClick={onSync}
              disabled={syncing}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md font-sans"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Sheets
            </button>
            <button
              onClick={onOpenManualTrade}
              disabled={!hasLinkedSheets}
              className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
            >
              Append Row To Sheet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
