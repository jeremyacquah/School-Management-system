import { getCachedData, setCachedData, queueOfflineOperation } from '../offline/offlineStorage';
import { syncEngine } from '../offline/syncEngine';

const API_BASE = (typeof window !== 'undefined' && window.location.protocol === 'file:')
  ? 'http://localhost:5000'
  : '';
const BASE_URL = `${API_BASE}/api`;

export const apiClient = {
  async get(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`, API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'));
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        url.searchParams.append(k, params[k]);
      }
    });

    const cacheKey = `${endpoint}_${url.search}`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('greenwood_token') : null;

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setCachedData(cacheKey, data);
      return { data, isOfflineCached: false };
    } catch (err) {
      // Fallback to offline cache if local backend is temporarily starting up
      const cached = getCachedData(cacheKey);
      if (cached) {
        return { data: cached, isOfflineCached: true, error: err.message };
      }
      const baseCached = getCachedData(`${endpoint}_`);
      if (baseCached) {
        return { data: baseCached, isOfflineCached: true };
      }
      return { data: [], isOfflineCached: true, notice: 'Offline: Local database starting up.' };
    }
  },

  async post(endpoint, body = {}, meta = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('greenwood_token') : null;

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return { data };
    } catch (err) {
      const queuedOp = queueOfflineOperation({
        module: meta.module || endpoint.replace('/', '').split('/')[0] || 'general',
        action: 'CREATE',
        payload: body
      });
      return {
        data: {
          message: 'Saved to local offline queue. Will commit to local database.',
          offlineQueued: true,
          queueId: queuedOp.id
        }
      };
    }
  },

  async put(endpoint, body = {}, meta = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('greenwood_token') : null;

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return { data };
    } catch (err) {
      const queuedOp = queueOfflineOperation({
        module: meta.module || endpoint.replace('/', '').split('/')[0] || 'general',
        action: 'UPDATE',
        record_id: endpoint.split('/').pop(),
        payload: body
      });
      return {
        data: {
          message: 'Saved to local offline queue.',
          offlineQueued: true,
          queueId: queuedOp.id
        }
      };
    }
  },

  async delete(endpoint, meta = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('greenwood_token') : null;

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return { data };
    } catch (err) {
      const queuedOp = queueOfflineOperation({
        module: meta.module || endpoint.replace('/', '').split('/')[0] || 'general',
        action: 'DELETE',
        record_id: endpoint.split('/').pop()
      });
      return {
        data: {
          message: 'Saved to local offline queue.',
          offlineQueued: true,
          queueId: queuedOp.id
        }
      };
    }
  }
};
