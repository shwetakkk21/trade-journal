import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function NotificationModal({ isOpen, onClose, onConfirm, title, message, type = 'INFO' }) {
  if (!isOpen) return null;

  
  const isActionConfirmation = (type === 'CONFIRM' || type === 'WARNING') && typeof onConfirm === 'function';

  const renderThemedIcon = () => {
    switch (type) {
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'CONFIRM':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Info className="w-5 h-5 text-teal-400" />;
    }
  };

  const getHeaderStyleClass = () => {
    if (type === 'WARNING') return 'bg-rose-950/40 border-rose-800/60';
    if (type === 'CONFIRM') return 'bg-amber-950/40 border-amber-800/60';
    if (type === 'SUCCESS') return 'bg-emerald-950/40 border-emerald-800/60';
    return 'bg-slate-950/40 border-slate-800/60';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Main Header Content */}
        <div className="px-6 pt-6 pb-2 flex items-start gap-3">
          <div className={`p-2 rounded-lg border flex-shrink-0 ${getHeaderStyleClass()}`}>
            {renderThemedIcon()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mt-1">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Action Button Configurations */}
        <div className="bg-slate-950/40 px-6 py-4 mt-6 border-t border-slate-800/60 flex justify-end gap-3">
          {isActionConfirmation ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2 rounded-lg transition-all font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 rounded-lg shadow-md transition-all font-sans"
              >
                Confirm Action
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all font-sans"
            >
              Acknowledge Guardrail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}