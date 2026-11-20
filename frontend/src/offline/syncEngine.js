import { getOutbox, removeSyncedOperations } from './offlineStorage';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.isOffline = true;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  getStatus(extra = {}) {
    return {
      isOffline: true,
      isSyncing: this.isSyncing,
      outboxCount: getOutbox().length,
      ...extra
    };
  }

  notifyStatus(extra = {}) {
    const status = this.getStatus(extra);
    this.listeners.forEach(fn => fn(status));
  }

  async syncNow() {
    if (this.isSyncing) return;
    const outbox = getOutbox();
    if (outbox.length === 0) {
      this.notifyStatus({ message: 'All local changes are committed to school.db.' });
      return { syncedCount: 0, conflictsCount: 0 };
    }

    this.isSyncing = true;
    this.notifyStatus();

    try {
      const apiBase = (typeof window !== 'undefined' && window.location.protocol === 'file:')
        ? 'http://localhost:5000'
        : '';
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('greenwood_token') : null;
      const response = await fetch(`${apiBase}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ operations: outbox })
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with ${response.status}`);
      }

      const result = await response.json();
      const { synced_ids = [], conflicts = [] } = result;

      // Remove successfully synced IDs from local outbox
      removeSyncedOperations(synced_ids);

      const conflictsCount = conflicts.length;
      const syncedCount = synced_ids.length;

      this.isSyncing = false;
      this.notifyStatus({
        syncedCount,
        conflictsCount,
        message: `Committed ${syncedCount} item(s) to local database. ${conflictsCount > 0 ? `${conflictsCount} conflict(s) flagged.` : ''}`
      });

      window.dispatchEvent(new CustomEvent('sync_completed', { detail: { syncedCount, conflictsCount } }));
      return { syncedCount, conflictsCount, conflicts };
    } catch (err) {
      console.error('Local sync failed:', err);
      this.isSyncing = false;
      this.notifyStatus({ error: err.message });
      throw err;
    }
  }
}

export const syncEngine = new SyncEngine();
