import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  GitMerge,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const SyncConflictsPage = () => {
  const { isAdmin } = useAuth();
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadConflicts();
    }
  }, [isAdmin]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/sync/conflicts');
      setConflicts(res.data || []);
    } catch (e) {
      console.warn('Conflicts error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    try {
      const res = await apiClient.post(`/sync/conflicts/${conflictId}/resolve`, {
        resolution
      });
      setStatusMsg(res.data.message || 'Conflict resolved.');
      loadConflicts();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Resolution Error: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-900 space-y-2">
        <GitMerge className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold">Admin Only: Conflict Resolution</h3>
        <p className="text-xs text-rose-700">
          Only School Administrators have permission to review and resolve offline synchronization data conflicts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 11: Offline Sync & Conflict Resolution</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review concurrent changes made offline vs server. Admin chooses to accept local offline edits or preserve server data.
          </p>
        </div>

        <button
          onClick={loadConflicts}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Check Conflicts</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {statusMsg}
        </div>
      )}

      {/* Conflicts List */}
      <div className="space-y-4">
        {conflicts.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <strong className="text-sm font-bold text-slate-900 capitalize">
                  {c.module} Conflict (Record #{c.record_id})
                </strong>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                  {c.client_sync_id}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Detected on: {c.created_at}</span>
            </div>

            <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
              ⚠️ Reason: {c.conflict_reason}
            </p>

            {/* Side by Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Local Offline Version */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="flex justify-between items-center text-blue-900 font-sans font-bold">
                  <span>📱 Local Offline Client Version</span>
                  <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">Client Edited</span>
                </div>
                <pre className="text-[11px] bg-white p-2.5 rounded border border-blue-100 overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-800 max-h-48">
                  {JSON.stringify(c.local_data, null, 2)}
                </pre>
              </div>

              {/* Server Current Version */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2">
                <div className="flex justify-between items-center text-purple-900 font-sans font-bold">
                  <span>☁️ Central Server Version</span>
                  <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded">Server Database</span>
                </div>
                <pre className="text-[11px] bg-white p-2.5 rounded border border-purple-100 overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-800 max-h-48">
                  {JSON.stringify(c.server_data, null, 2)}
                </pre>
              </div>
            </div>

            {/* Admin Resolution Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 font-sans">
              <button
                onClick={() => handleResolveConflict(c.id, 'keep_server')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Discard Offline (Keep Server)
              </button>
              <button
                onClick={() => handleResolveConflict(c.id, 'keep_local')}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
              >
                Accept Offline Edits (Overwrite Server)
              </button>
            </div>
          </div>
        ))}

        {conflicts.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Zero Pending Conflicts</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All desktop and mobile offline mutations have synchronized cleanly with no concurrent conflicts detected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
