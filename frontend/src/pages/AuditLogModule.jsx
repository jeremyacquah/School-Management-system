import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const AuditLogModule = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadAuditLogs();
    }
  }, [moduleFilter, actionFilter, search, isAdmin]);

  const loadAuditLogs = async () => {
    try {
      const res = await apiClient.get('/audit-logs', {
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
        limit: 100
      });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.warn('Audit logs load error:', e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-900 space-y-2">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold">Access Restricted</h3>
        <p className="text-xs text-rose-700">
          Security Policy: The System Audit Log records every CREATE, UPDATE, and DELETE action and can only be inspected by authorized School Administrators.
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
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 10: System Audit Log & Security</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all CREATE, UPDATE, DELETE, SYNC & SECURITY operations with user timestamps and diffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-100 text-purple-900 font-bold px-2.5 py-1 rounded-lg border border-purple-200">
            {total} Total Audit Records
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search user, record ID or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg p-2 text-xs w-64 bg-slate-50"
          />

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">All Modules</option>
            <option value="Attendance">Attendance</option>
            <option value="Grades">Grades & Reports</option>
            <option value="Fees">Fees & Payments</option>
            <option value="Timetable">Timetable</option>
            <option value="Notices">Notices</option>
            <option value="Library">Library</option>
            <option value="Exams">Exams</option>
            <option value="Assets">Assets</option>
            <option value="SyncEngine">Offline Sync</option>
            <option value="Auth">Authentication</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="SYNC">SYNC</option>
            <option value="RESOLVE_CONFLICT">RESOLVE CONFLICT</option>
          </select>
        </div>

        <button
          onClick={loadAuditLogs}
          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
        >
          Refresh Logs
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-700 text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor (User)</th>
                <th className="py-2.5 px-2 text-center">Role</th>
                <th className="py-2.5 px-2 text-center">Action</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Target ID</th>
                <th className="py-2.5 px-3">Action Details & Diffs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {logs.map((l, idx) => (
                <tr key={l.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{l.timestamp}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{l.username}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      l.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      l.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {l.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      l.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                      l.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      l.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                      l.action === 'SYNC' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{l.module}</td>
                  <td className="py-2.5 px-3 text-slate-600">{l.record_id || '-'}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-700 leading-snug">{l.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-sans text-xs">
                    No audit logs found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
