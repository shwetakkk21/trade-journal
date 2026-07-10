import { LayoutGrid, Settings, LogOut, User, ShieldAlert } from 'lucide-react';

const tabButtonBase =
  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all';
const activeTabCls = 'bg-teal-500 text-slate-950 shadow-md';
const inactiveTabCls = 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200';

export function AppHeader({ user, isAdmin, activeTab: tab, onTabChange, onLogout }) {
  const cls = (name) => `${tabButtonBase} ${tab === name ? activeTabCls : inactiveTabCls}`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100">
            Hello, {user.displayName || 'Trader'}
          </h1>
          <p className="text-[10px] text-slate-400 font-mono">
            Welcome to your trading journey
          </p>
        </div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto justify-end">
        <button onClick={() => onTabChange('dashboard')} className={cls('dashboard')}>
          <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
        </button>
        <button onClick={() => onTabChange('snapshots')} className={cls('snapshots')}>
          <Settings className="w-3.5 h-3.5" /> Workbook
        </button>
        <button onClick={() => onTabChange('settings')} className={cls('settings')}>
          <Settings className="w-3.5 h-3.5" /> Linked Sheets
        </button>
        {isAdmin && (
          <button
            onClick={() => onTabChange('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all duration-200 ${
              tab === 'admin'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/20 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Admin Panel
          </button>
        )}
        <button
          onClick={onLogout}
          className="bg-rose-950/20 border border-rose-900 text-rose-400 p-1.5 rounded-lg transition-all"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
