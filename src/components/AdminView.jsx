import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import { Check, X, Trash2, ShieldAlert } from 'lucide-react';

export function AdminView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const currentAdminUid = auth.currentUser?.uid;

    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(account => account.id !== currentAdminUid);
        
      setUsers(usersList);
      setLoading(false);
    }, (err) => {
      console.error("Unauthorized fetch drop:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
    } catch (err) {
      alert("Action refused: Insufficient database privileges.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently purge this registration record? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      alert("Deletion refused: Insufficient database privileges.");
    }
  };

  if (loading) return <div className="p-6 text-slate-400 animate-pulse text-xs font-mono">LOADING APPROVAL DETAILS...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">Approval Section</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-mono">
              <th className="p-4">User Details</th>
              <th className="p-4">Unique Identity ID</th>
              <th className="p-4">Current Status</th>
              <th className="p-4 text-right">Governance Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {users.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500 italic font-sans">
                  No other active user profiles discovered inside the authentication database.
                </td>
              </tr>
            ) : (
              users.map((account) => (
                <tr key={account.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-200">{account.displayName || 'Anonymous'}</div>
                    <div className="text-[11px] text-slate-500 font-sans">{account.email}</div>
                  </td>
                  <td className="p-4 text-slate-500 text-[11px]">{account.id}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      account.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      account.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {account.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {account.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateStatus(account.id, 'APPROVED')}
                        className="p-2 bg-slate-800 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-slate-700/50 rounded-lg transition-all"
                        title="Approve User"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {account.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateStatus(account.id, 'REJECTED')}
                        className="p-2 bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 rounded-lg transition-all"
                        title="Reject User"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(account.id)}
                      className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-500 border border-slate-700/50 rounded-lg transition-all"
                      title="Purge Account Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}