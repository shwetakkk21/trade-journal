import React from 'react';
import { Clock, LogOut, ShieldX } from 'lucide-react';

export function PendingApprovalScreen({ approvalStatus, onLogout }) {
  const isRejected = approvalStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isRejected ? 'from-rose-500 to-red-500' : 'from-amber-500 to-yellow-500'}`} />
        
        {isRejected ? (
          <ShieldX className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        ) : (
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
        )}

        <h2 className="text-xl font-bold text-slate-100 tracking-wide">
          {isRejected ? 'Access Denied' : 'Approval Pending'}
        </h2>
        
        <p className="text-xs text-slate-400 mt-4 leading-relaxed font-mono">
          {isRejected 
            ? 'Your profile has been rejected by an administrator. Reach out to support to appeal this action.'
            : 'Your profile is currently under review. The dashboard will automatically unlock the second an administrator approves your request.'
          }
        </p>

        <button
          onClick={onLogout}
          className="mt-6 w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" /> Disconnect Session
        </button>
      </div>
    </div>
  );
}