import React, { useState, useEffect } from 'react';
import { syncEngine } from '../offline/syncEngine';
import { getOutbox } from '../offline/offlineStorage';
import { ShieldCheck, HardDrive, Database, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const OfflineSyncBanner = () => {
  const [status, setStatus] = useState(() => syncEngine.getStatus());
  const [notification, setNotification] = useState('');
  const [hasConflicts, setHasConflicts] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((st) => {
      setStatus(st);
      if (st.message) {
        setNotification(st.message);
        setTimeout(() => setNotification(''), 6000);
      }
      if (st.conflictsCount && st.conflictsCount > 0) {
        setHasConflicts(true);
      }
    });

    const handleOutboxUpdate = (e) => {
      setStatus(prev => ({ ...prev, outboxCount: e.detail?.count || 0 }));
    };

    window.addEventListener('outbox_updated', handleOutboxUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('outbox_updated', handleOutboxUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      await syncEngine.syncNow();
    } catch (err) {
      setNotification(`Sync error: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-sm text-slate-300 select-none">
      {/* 100% Offline Status & Local Database */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Offline Badge */}
        <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-800/80 font-bold" title="Greenwood SMS is running 100% offline. All school data is stored locally on this machine and never sent over the internet.">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Offline Mode (Local Desktop)</span>
        </span>

        {/* Local SQLite Database Indicator */}
        <span className="inline-flex items-center gap-1.5 text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/80 font-mono text-[11px]" title="Database is stored locally in backend/school.db (SQLite) on this computer. Zero internet required.">
          <HardDrive className="w-3.5 h-3.5 text-brand-400" />
          <span>Database: school.db (Local SQLite)</span>
        </span>

        {/* Outbox Pending Counter */}
        {status.outboxCount > 0 ? (
          <span className="flex items-center gap-1 text-amber-300 bg-amber-900/50 px-2 py-0.5 rounded border border-amber-700/60 font-semibold">
            <Database className="w-3 h-3 text-amber-400" />
            <span>{status.outboxCount} pending local commit</span>
          </span>
        ) : (
          <span className="hidden sm:flex items-center gap-1 text-slate-400">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Local DB Active & Synced</span>
          </span>
        )}

        {/* Sync conflict warning badge */}
        {hasConflicts && (
          <span className="flex items-center gap-1 text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800 animate-pulse font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Admin Review: Conflicts Detected</span>
          </span>
        )}
      </div>

      {/* Actions & Notifications */}
      <div className="flex items-center gap-2">
        {notification && (
          <span className="text-emerald-300 font-medium truncate max-w-xs sm:max-w-md">
            {notification}
          </span>
        )}

        <button
          onClick={handleManualSync}
          disabled={status.isSyncing || status.outboxCount === 0}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            status.outboxCount > 0
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Commit pending offline operations to the local database"
        >
          <RefreshCw className={`w-3 h-3 ${status.isSyncing ? 'animate-spin text-white' : ''}`} />
          <span>{status.isSyncing ? 'Syncing...' : 'Sync Local DB'}</span>
        </button>
      </div>
    </div>
  );
};
