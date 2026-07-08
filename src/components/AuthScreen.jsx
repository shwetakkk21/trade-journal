import { Shield, LogIn } from 'lucide-react';

export function AuthScreen({ onLogin }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <Shield className="w-12 h-12 text-teal-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-100 tracking-wide">
          Welcome to TheTradeJournal
        </h2>
        <button
          onClick={onLogin}
          className="mt-6 w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-lg"
        >
          <LogIn className="w-4 h-4" /> Authenticate Account Profile
        </button>
      </div>
    </div>
  );
}
