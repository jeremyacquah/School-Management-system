import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Clock,
  Calendar,
  Plus,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export const WeeksTermsModule = () => {
  const { isAdmin } = useAuth();

  const [terms, setTerms] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Create Term Form
  const [newTerm, setNewTerm] = useState({
    session_year: '2026/2027',
    term_name: 'Term 2',
    start_date: '2027-01-08',
    end_date: '2027-04-10',
    is_active: false
  });

  // Create Week Form
  const [newWeek, setNewWeek] = useState({
    week_number: '13',
    week_title: 'Week 13 - Term Wrap Up',
    start_date: '2026-11-24',
    end_date: '2026-11-28',
    is_current: false
  });

  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadTerms();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedTermId) {
      loadWeeks(selectedTermId);
    }
  }, [selectedTermId]);

  const loadTerms = async () => {
    try {
      const res = await apiClient.get('/terms');
      const tList = res.data || [];
      setTerms(tList);
      if (tList.length > 0 && !selectedTermId) {
        setSelectedTermId(String(tList[0].id));
      }
    } catch (e) {
      console.warn('Terms load error:', e);
    }
  };

  const loadWeeks = async (termId) => {
    try {
      const res = await apiClient.get('/weeks', { term_id: termId });
      setWeeks(res.data || []);
    } catch (e) {
      console.warn('Weeks load error:', e);
    }
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatusMsg('');
    try {
      await apiClient.post('/terms', newTerm);
      setStatusMsg('Academic Term created successfully.');
      loadTerms();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Term Error: ${err.message}`);
    }
  };

  const handleCreateWeek = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatusMsg('');
    try {
      await apiClient.post('/weeks', {
        ...newWeek,
        term_id: Number(selectedTermId),
        week_number: Number(newWeek.week_number)
      });
      setStatusMsg('School Week added successfully.');
      loadWeeks(selectedTermId);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Week Error: ${err.message}`);
    }
  };

  const handleSetActiveTerm = async (termId) => {
    if (!isAdmin) return;
    try {
      await apiClient.put(`/terms/${termId}`, { is_active: 1 });
      loadTerms();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSetCurrentWeek = async (weekId) => {
    if (!isAdmin) return;
    try {
      await apiClient.put(`/weeks/${weekId}`, { is_current: 1, term_id: Number(selectedTermId) });
      loadWeeks(selectedTermId);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-900 space-y-2">
        <Clock className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold">Admin Permission Required</h3>
        <p className="text-xs text-rose-700">
          Only School Administrators have permission to create and configure school sessions, terms, and academic weeks.
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
            <Clock className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Weeks & Academic Terms Manager</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Admin creates and manages academic sessions, terms and school weeks. All student attendance, grades, and payments link to these cycles.
          </p>
        </div>

        <span className="text-xs bg-purple-100 text-purple-900 font-bold px-2.5 py-1 rounded-lg border border-purple-200">
          Administrator Only
        </span>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          statusMsg.includes('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terms Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Academic Terms</span>
            </h3>
          </div>

          {/* Create Term Form */}
          <form onSubmit={handleCreateTerm} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Create Academic Term</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Session (e.g. 2026/2027)"
                value={newTerm.session_year}
                onChange={(e) => setNewTerm({ ...newTerm, session_year: e.target.value })}
                className="border border-slate-200 rounded p-1.5 text-xs font-semibold"
                required
              />
              <input
                type="text"
                placeholder="Term Name (e.g. Term 2)"
                value={newTerm.term_name}
                onChange={(e) => setNewTerm({ ...newTerm, term_name: e.target.value })}
                className="border border-slate-200 rounded p-1.5 text-xs font-semibold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block">Start Date</label>
                <input
                  type="date"
                  value={newTerm.start_date}
                  onChange={(e) => setNewTerm({ ...newTerm, start_date: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block">End Date</label>
                <input
                  type="date"
                  value={newTerm.end_date}
                  onChange={(e) => setNewTerm({ ...newTerm, end_date: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 rounded text-xs"
            >
              Add Term
            </button>
          </form>

          {/* Terms List */}
          <div className="space-y-2">
            {terms.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTermId(String(t.id))}
                className={`p-3 rounded-xl border text-xs flex justify-between items-center cursor-pointer transition-all ${
                  selectedTermId === String(t.id) ? 'bg-brand-50 border-brand-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-slate-900">{t.term_name}</strong>
                    <span className="text-slate-500 font-mono">({t.session_year})</span>
                    {t.is_active === 1 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{t.start_date} to {t.end_date}</span>
                </div>

                {t.is_active !== 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetActiveTerm(t.id);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold"
                  >
                    Set Active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weeks Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>School Weeks in Selected Term</span>
            </h3>
            <span className="text-xs text-slate-500">{weeks.length} weeks scheduled</span>
          </div>

          {/* Create Week Form */}
          <form onSubmit={handleCreateWeek} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Add Academic Week</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="1"
                placeholder="Week #"
                value={newWeek.week_number}
                onChange={(e) => setNewWeek({ ...newWeek, week_number: e.target.value })}
                className="border border-slate-200 rounded p-1.5 text-xs font-semibold"
                required
              />
              <input
                type="text"
                placeholder="Title (e.g. Unit 3 Review)"
                value={newWeek.week_title}
                onChange={(e) => setNewWeek({ ...newWeek, week_title: e.target.value })}
                className="col-span-2 border border-slate-200 rounded p-1.5 text-xs font-semibold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block">Start Date</label>
                <input
                  type="date"
                  value={newWeek.start_date}
                  onChange={(e) => setNewWeek({ ...newWeek, start_date: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block">End Date</label>
                <input
                  type="date"
                  value={newWeek.end_date}
                  onChange={(e) => setNewWeek({ ...newWeek, end_date: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 rounded text-xs"
            >
              Add Week
            </button>
          </form>

          {/* Weeks List */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {weeks.map(w => (
              <div
                key={w.id}
                className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-bold">Week {w.week_number}:</strong>
                    <span className="text-slate-700">{w.week_title}</span>
                    {w.is_current === 1 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{w.start_date} to {w.end_date}</span>
                </div>

                {w.is_current !== 1 && (
                  <button
                    onClick={() => handleSetCurrentWeek(w.id)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium"
                  >
                    Set Current
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
