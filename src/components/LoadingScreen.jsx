import { RefreshCw } from 'lucide-react';

export function LoadingScreen({ label = 'LOADING YOUR DASHBOARD...' }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 font-mono text-xs tracking-widest">
      <RefreshCw className="w-5 h-5 animate-spin text-teal-400 mb-3" />
      {label}
    </div>
  );
}
