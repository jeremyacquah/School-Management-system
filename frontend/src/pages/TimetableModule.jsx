import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Users,
  MapPin,
  BookOpen,
  Printer,
  Edit2,
  Filter,
  Layers,
  Search,
  Grid,
  Eye,
  Check
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const STAGES = [
  { id: 'all', label: 'All Classes', icon: '🏫' },
  { id: 'kg', label: 'Kindergarten', icon: '🧸', match: (name) => name.startsWith('KG') },
  { id: 'primary', label: 'Primary School', icon: '🎒', match: (name) => name.startsWith('Class') },
  { id: 'jhs', label: 'Junior High (JHS)', icon: '🎓', match: (name) => name.startsWith('JHS') }
];

const STANDARD_PERIODS = [
  { label: 'Period 1', start: '08:00', end: '08:45' },
  { label: 'Period 2', start: '08:45', end: '09:30' },
  { label: 'Period 3', start: '09:30', end: '10:15' },
  { label: 'Break', start: '10:15', end: '10:45', isBreak: true, title: 'Snack & Recess' },
  { label: 'Period 4', start: '10:45', end: '11:30' },
  { label: 'Period 5', start: '11:30', end: '12:15' },
  { label: 'Lunch', start: '12:15', end: '13:00', isBreak: true, title: 'Lunch & Free Play' },
  { label: 'Period 6', start: '13:00', end: '13:45' },
  { label: 'Period 7', start: '13:45', end: '14:30' }
];

const getSubjectBadgeStyle = (subjectName = '') => {
  const name = subjectName.toLowerCase();
  if (name.includes('math') || name.includes('numeracy')) {
    return { bg: 'bg-emerald-50 text-emerald-900 border-emerald-200', tag: 'bg-emerald-600 text-white', dot: 'bg-emerald-500', bar: 'border-l-emerald-500' };
  }
  if (name.includes('english') || name.includes('literacy') || name.includes('phonics')) {
    return { bg: 'bg-blue-50 text-blue-900 border-blue-200', tag: 'bg-blue-600 text-white', dot: 'bg-blue-500', bar: 'border-l-blue-500' };
  }
  if (name.includes('science') || name.includes('environment')) {
    return { bg: 'bg-purple-50 text-purple-900 border-purple-200', tag: 'bg-purple-600 text-white', dot: 'bg-purple-500', bar: 'border-l-purple-500' };
  }
  if (name.includes('comput') || name.includes('ict')) {
    return { bg: 'bg-cyan-50 text-cyan-900 border-cyan-200', tag: 'bg-cyan-600 text-white', dot: 'bg-cyan-500', bar: 'border-l-cyan-500' };
  }
  if (name.includes('social') || name.includes('civic')) {
    return { bg: 'bg-amber-50 text-amber-900 border-amber-200', tag: 'bg-amber-600 text-white', dot: 'bg-amber-500', bar: 'border-l-amber-500' };
  }
  if (name.includes('moral') || name.includes('rme') || name.includes('religio')) {
    return { bg: 'bg-rose-50 text-rose-900 border-rose-200', tag: 'bg-rose-600 text-white', dot: 'bg-rose-500', bar: 'border-l-rose-500' };
  }
  if (name.includes('art') || name.includes('craft') || name.includes('design') || name.includes('bdt')) {
    return { bg: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200', tag: 'bg-fuchsia-600 text-white', dot: 'bg-fuchsia-500', bar: 'border-l-fuchsia-500' };
  }
  if (name.includes('french')) {
    return { bg: 'bg-teal-50 text-teal-900 border-teal-200', tag: 'bg-teal-600 text-white', dot: 'bg-teal-500', bar: 'border-l-teal-500' };
  }
  if (name.includes('physic') || name.includes('health')) {
    return { bg: 'bg-lime-50 text-lime-900 border-lime-200', tag: 'bg-lime-600 text-white', dot: 'bg-lime-500', bar: 'border-l-lime-500' };
  }
  return { bg: 'bg-slate-50 text-slate-900 border-slate-200', tag: 'bg-slate-600 text-white', dot: 'bg-slate-500', bar: 'border-l-slate-400' };
};

export const TimetableModule = () => {
  const { role, isAdmin, isParent } = useAuth();

  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [allMasterSlots, setAllMasterSlots] = useState([]);

  // Active filters and views
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedClass, setSelectedClass] = useState('Class 1');
  const [selectedDay, setSelectedDay] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('grid'); // 'grid', 'daily', 'subjects', 'master'

  // Admin Slot Management Form
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [filterSubjectsByClass, setFilterSubjectsByClass] = useState(true);
  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_name: '',
    room: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '08:45'
  });

  const [clashError, setClashError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initial load
  useEffect(() => {
    loadMetadata();
  }, []);

  // When class or term changes, load slots
  useEffect(() => {
    if (selectedClass) {
      loadTimetableSlots();
    }
  }, [selectedTerm, selectedClass]);

  // Load all master slots when switching to Master Matrix
  useEffect(() => {
    if (activeTab === 'master') {
      loadAllSlots();
    }
  }, [activeTab, selectedTerm]);

  // Auto-fill teacher and room when selectedClass changes in form
  const currentClassInfo = useMemo(() => {
    return classes.find(c => c.name === selectedClass) || null;
  }, [classes, selectedClass]);

  const loadMetadata = async () => {
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        apiClient.get('/terms'),
        apiClient.get('/students/classes'),
        apiClient.get('/grades/subjects')
      ]);

      const termList = tRes.data || [];
      const classList = cRes.data || [];
      const subjectList = sRes.data || [];

      setTerms(termList);
      setClasses(classList);
      setSubjects(subjectList);

      if (termList.length > 0) {
        setSelectedTerm(String(termList[0].id));
      }

      if (isParent) {
        const stdRes = await apiClient.get('/students');
        if (stdRes.data && stdRes.data.length > 0) {
          const child = stdRes.data[0];
          setSelectedClass(child.class_grade);
        }
      } else if (classList.length > 0) {
        // Prefer Class 1, or the first available class
        const defaultCls = classList.find(c => c.name === 'Class 1') || classList[0];
        setSelectedClass(defaultCls.name);
        setFormData(prev => ({
          ...prev,
          teacher_name: defaultCls.class_teacher || 'Class Teacher',
          room: defaultCls.room || 'Classroom 101'
        }));
      }
    } catch (e) {
      console.warn('Timetable metadata error:', e);
    }
  };

  const loadTimetableSlots = async () => {
    try {
      const res = await apiClient.get('/timetable', {
        term_id: selectedTerm,
        class_grade: selectedClass
      });
      setSlots(res.data || []);
    } catch (e) {
      console.warn('Timetable load error:', e);
    }
  };

  const loadAllSlots = async () => {
    try {
      const res = await apiClient.get('/timetable', {
        term_id: selectedTerm,
        class_grade: 'all'
      });
      setAllMasterSlots(res.data || []);
    } catch (e) {
      console.warn('All timetable slots error:', e);
    }
  };

  // Switch active class
  const handleSelectClass = (className) => {
    setSelectedClass(className);
    setClashError('');
    setSuccessMsg('');
    const cls = classes.find(c => c.name === className);
    if (cls && !editingSlotId) {
      setFormData(prev => ({
        ...prev,
        teacher_name: cls.class_teacher || prev.teacher_name,
        room: cls.room || prev.room
      }));
    }
  };

  // Filter classes according to stage pill
  const filteredClasses = useMemo(() => {
    if (selectedStage === 'all') return classes;
    const stageObj = STAGES.find(s => s.id === selectedStage);
    if (!stageObj || !stageObj.match) return classes;
    return classes.filter(c => stageObj.match(c.name));
  }, [classes, selectedStage]);

  // Filter subjects for the selected class in slot form
  const classSubjects = useMemo(() => {
    if (!filterSubjectsByClass) return subjects;
    const filtered = subjects.filter(s => s.class_grade === selectedClass);
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, selectedClass, filterSubjectsByClass]);

  // Update default subject_id when classSubjects updates
  useEffect(() => {
    if (classSubjects.length > 0 && (!formData.subject_id || !classSubjects.some(s => s.id === Number(formData.subject_id)))) {
      setFormData(prev => ({ ...prev, subject_id: String(classSubjects[0].id) }));
    }
  }, [classSubjects]);

  // Filter active class timetable slots
  const displayedSlots = useMemo(() => {
    let result = slots;
    if (selectedDay !== 'All') {
      result = result.filter(s => s.day_of_week === selectedDay);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.subject_name && s.subject_name.toLowerCase().includes(term)) ||
        (s.subject_code && s.subject_code.toLowerCase().includes(term)) ||
        (s.teacher_name && s.teacher_name.toLowerCase().includes(term)) ||
        (s.room && s.room.toLowerCase().includes(term))
      );
    }
    return result;
  }, [slots, selectedDay, searchTerm]);

  // Aggregate subjects allocation for the selected class
  const subjectsAllocation = useMemo(() => {
    const map = {};
    for (const slot of slots) {
      const key = slot.subject_id || slot.subject_name;
      if (!map[key]) {
        map[key] = {
          id: slot.subject_id,
          name: slot.subject_name,
          code: slot.subject_code,
          teacher: slot.teacher_name,
          room: slot.room,
          count: 0,
          days: new Set(),
          times: []
        };
      }
      map[key].count += 1;
      map[key].days.add(slot.day_of_week);
      map[key].times.push(`${slot.day_of_week.substring(0, 3)} ${slot.start_time}-${slot.end_time}`);
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [slots]);

  // Start editing a slot
  const handleEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setFormData({
      subject_id: String(slot.subject_id),
      teacher_name: slot.teacher_name,
      room: slot.room,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time
    });
    setShowSlotForm(true);
    setClashError('');
    setSuccessMsg('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSlotId(null);
    setShowSlotForm(false);
    setClashError('');
  };

  // Submit Slot (Create or Update)
  const handleSubmitSlot = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setClashError('');
    setSuccessMsg('');

    try {
      const payload = {
        term_id: Number(selectedTerm),
        class_grade: selectedClass,
        subject_id: Number(formData.subject_id),
        teacher_name: formData.teacher_name.trim(),
        room: formData.room.trim(),
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time
      };

      if (editingSlotId) {
        await apiClient.put(`/timetable/${editingSlotId}`, payload);
        setSuccessMsg(`Timetable slot for ${selectedClass} updated successfully!`);
      } else {
        const res = await apiClient.post('/timetable', payload);
        setSuccessMsg(res.data.message || `Subject assigned to ${selectedClass} with zero clashes!`);
      }

      setEditingSlotId(null);
      loadTimetableSlots();
      if (activeTab === 'master') loadAllSlots();
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      setClashError(err.message || 'Timetable scheduling error');
    }
  };

  // Delete a slot
  const handleDeleteSlot = async (id) => {
    if (!isAdmin) return;
    if (!confirm('Remove this timetable slot?')) return;
    try {
      await apiClient.delete(`/timetable/${id}`);
      loadTimetableSlots();
      if (activeTab === 'master') loadAllSlots();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-700 rounded-xl">
              <Calendar className="w-5 h-5 text-brand-600" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Module 5: Timetable & Master Scheduling</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Class-grouped timetables with day & time breakdown, automated clash detection, and full offline synchronization.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Term Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-semibold">Term:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.term_name || `Term ${t.id}`}</option>
              ))}
            </select>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            title="Print Timetable"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Admin Assign Slot Toggle */}
          {isAdmin && (
            <button
              onClick={() => {
                setShowSlotForm(prev => !prev);
                setEditingSlotId(null);
                setClashError('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showSlotForm ? 'Close Form' : 'Assign Lesson Slot'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CLASH ALERT BANNER */}
      {clashError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-3 shadow-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-rose-800">Scheduling Clash Detected!</strong>
            <p className="mt-0.5 leading-relaxed">{clashError}</p>
          </div>
        </div>
      )}

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CLASS GROUPING NAVIGATION BAR */}
      {!isParent && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Stage Tabs (Kindergarten, Primary, Junior High, All) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Stage:</span>
            {STAGES.map(stage => {
              const active = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}
                >
                  <span>{stage.icon}</span>
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 self-end sm:self-auto">
            <span>Select a class below to view its daily subjects & times:</span>
          </div>
        </div>

        {/* Class Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredClasses.map(cls => {
            const isSelected = selectedClass === cls.name;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls.name)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-brand-50/70 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <span className={`text-xs font-bold ${isSelected ? 'text-brand-900' : 'text-slate-800'}`}>
                  {cls.name}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 truncate w-full flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span className="truncate">{cls.room || 'Classroom'}</span>
                </span>
                <span className="text-[10px] text-slate-400 truncate w-full">
                  {cls.class_teacher || 'Assigned Teacher'}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* SELECTED CLASS BANNER & CONTROLS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold uppercase tracking-wider">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>{isParent ? "Child's Class Timetable" : "Active Class Timetable"}</span>
              </span>
              <span className="text-slate-400 text-xs font-medium">
                Term {selectedTerm} • 2026/2027 Academic Year
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedClass}
              </h1>
              {currentClassInfo?.room && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>{currentClassInfo.room}</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 mt-2 flex flex-wrap items-center gap-2.5">
              <span>Class Teacher: <strong className="text-slate-900 font-semibold">{currentClassInfo?.class_teacher || 'General Staff'}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>{slots.length} Scheduled Lessons/Week</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">Subjects: <strong className="text-slate-800 font-semibold">{subjectsAllocation.length} Subjects</strong></span>
            </div>
          </div>

          {/* Quick Day & Search Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subject / teacher..."
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-48 transition-all"
              />
            </div>

            {/* Day Filter */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold text-xs outline-none focus:bg-white focus:border-brand-500 cursor-pointer transition-all"
            >
              <option value="All">All Days (Mon - Fri)</option>
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'grid'
                ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Weekly Grid View</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Period Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subjects & Hours ({subjectsAllocation.length})</span>
          </button>

          {!isParent && (
            <button
              onClick={() => setActiveTab('master')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'master'
                  ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Classes Master Matrix</span>
            </button>
          )}
        </div>
      </div>

      {/* ADMIN ASSIGN / EDIT LESSON SLOT DRAWER */}
      {isAdmin && showSlotForm && (
        <div className="bg-white p-6 rounded-2xl border-2 border-brand-200 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                {editingSlotId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {editingSlotId ? `Edit Scheduled Lesson #${editingSlotId}` : `Admin: Assign New Lesson Slot to ${selectedClass}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Automatic clash detection prevents room overlaps and teacher double-booking.
                </p>
              </div>
            </div>
            {editingSlotId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Subject */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Subject</label>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSubjectsByClass}
                      onChange={(e) => setFilterSubjectsByClass(e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span>Class subjects only</span>
                  </label>
                </div>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                  required
                >
                  {classSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.class_grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Assigned Teacher</label>
                <input
                  type="text"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                  placeholder="e.g. Mr. Samuel Appiah"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              {/* Classroom / Room */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Room / Facility</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. Block B - Room 103"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Day of Week */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Day of Week</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Start Time (24h)</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              {/* End Time */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">End Time (24h)</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Quick Period Presets */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold mr-1">Quick Period Presets:</span>
              {STANDARD_PERIODS.filter(p => !p.isBreak).map(p => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setFormData(prev => ({ ...prev, start_time: p.start, end_time: p.end }))}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                >
                  {p.label} ({p.start}-{p.end})
                </button>
              ))}
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSlotForm(false);
                  setEditingSlotId(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Close
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-sm transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{editingSlotId ? 'Save Lesson Slot Changes' : `Verify & Schedule into ${selectedClass}`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 1: WEEKLY SCHEDULE GRID (MONDAY TO FRIDAY) */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {DAYS_OF_WEEK.map(day => {
              const daySlots = displayedSlots
                .filter(s => s.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div
                  key={day}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 flex flex-col space-y-3"
                >
                  {/* Day Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">{day}</strong>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {daySlots.length} {daySlots.length === 1 ? 'lesson' : 'lessons'}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            day_of_week: day,
                            teacher_name: currentClassInfo?.class_teacher || prev.teacher_name,
                            room: currentClassInfo?.room || prev.room
                          }));
                          setEditingSlotId(null);
                          setShowSlotForm(true);
                        }}
                        className="text-slate-400 hover:text-brand-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
                        title={`Add lesson to ${day}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day Slots List */}
                  <div className="space-y-2.5 flex-1 min-h-[220px]">
                    {daySlots.map(slot => {
                      const badgeStyle = getSubjectBadgeStyle(slot.subject_name);
                      return (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-xl border ${badgeStyle.bg} shadow-2xs space-y-2 relative group hover:shadow-xs transition-all`}
                        >
                          {/* Subject Title & Code */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <strong className="text-xs font-bold block leading-tight">
                                {slot.subject_name}
                              </strong>
                              <span className="text-[10px] font-mono opacity-75 font-semibold">
                                {slot.subject_code}
                              </span>
                            </div>

                            {/* Admin Slot Actions */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditSlot(slot)}
                                  className="p-1 text-slate-400 hover:text-brand-600 rounded"
                                  title="Edit slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Time & Teacher & Room Details */}
                          <div className="space-y-1 text-[11px] pt-1.5 border-t border-black/5">
                            <div className="flex items-center gap-1 font-semibold text-slate-800 font-mono text-[10px]">
                              <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                              <span>{slot.start_time} - {slot.end_time}</span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-700 truncate text-[10.5px]">
                              <Users className="w-3 h-3 shrink-0 text-slate-500" />
                              <span className="truncate">{slot.teacher_name}</span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-600 truncate text-[10.5px]">
                              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{slot.room}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {daySlots.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-44 text-slate-400 text-center p-3 rounded-xl border border-dashed border-slate-200">
                        <Calendar className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-xs font-semibold">No lessons</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Free or off-schedule day</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY PERIOD TIMELINE */}
      {activeTab === 'daily' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daily Schedule Timeline: {selectedClass}
              </h3>
              <p className="text-xs text-slate-500">
                Detailed period-by-period breakdown showing all subjects, teachers, and meal breaks for the day.
              </p>
            </div>

            {/* Day Selector Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDay === d
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="space-y-3">
            {STANDARD_PERIODS.map((period, idx) => {
              if (period.isBreak) {
                return (
                  <div
                    key={period.label}
                    className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/80 px-4 py-2.5 rounded-xl text-amber-900 text-xs font-semibold"
                  >
                    <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {period.start} - {period.end}
                    </span>
                    <span className="text-base">{period.label === 'Lunch' ? '🍲' : '🥪'}</span>
                    <span>{period.title}</span>
                  </div>
                );
              }

              // Find slot matching this period on selectedDay (or Monday if All)
              const targetDay = selectedDay === 'All' ? 'Monday' : selectedDay;
              const slot = slots.find(s => s.day_of_week === targetDay && s.start_time === period.start);
              const badgeStyle = slot ? getSubjectBadgeStyle(slot.subject_name) : null;

              return (
                <div
                  key={period.label}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                    slot
                      ? `${badgeStyle.bg} shadow-xs`
                      : 'bg-slate-50/70 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-[100px]">
                      <span className="text-xs font-bold text-slate-700 block">{period.label}</span>
                      <span className="text-xs font-mono font-semibold text-slate-500">{period.start} - {period.end}</span>
                    </div>

                    {slot ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold">{slot.subject_name}</strong>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/10">
                            {slot.subject_code}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs mt-1 opacity-80">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{slot.teacher_name}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{slot.room}</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400">
                        Study Hall / Free Period (No scheduled lesson)
                      </span>
                    )}
                  </div>

                  {slot && isAdmin && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleEditSlot(slot)}
                        className="px-2.5 py-1 bg-white/80 hover:bg-white text-slate-700 rounded text-xs font-semibold border border-black/10 shadow-2xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold border border-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: SUBJECTS & WEEKLY ALLOCATION */}
      {activeTab === 'subjects' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Curriculum Subjects Offered in {selectedClass}
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown of weekly periods and teaching hours allocated to each subject for this class.
              </p>
            </div>
            <div className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200">
              Total: {subjectsAllocation.reduce((acc, s) => acc + s.count, 0)} Weekly Periods
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Subject Teacher</th>
                  <th className="p-3">Dedicated Room</th>
                  <th className="p-3 text-center">Periods / Week</th>
                  <th className="p-3">Weekly Schedule</th>
                  <th className="p-3 text-right">Estimated Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectsAllocation.map(item => {
                  const badge = getSubjectBadgeStyle(item.name);
                  const totalMinutes = item.count * 45;
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;

                  return (
                    <tr key={item.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
                        <span>{item.name}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-500">{item.code}</td>
                      <td className="p-3 text-slate-700 font-medium">{item.teacher}</td>
                      <td className="p-3 text-slate-600">{item.room}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800">
                          {item.count}x / week
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {Array.from(item.days).join(', ')}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {hours}h {mins > 0 ? `${mins}m` : ''}
                      </td>
                    </tr>
                  );
                })}

                {subjectsAllocation.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 italic">
                      No subjects scheduled for {selectedClass} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: ALL CLASSES MASTER MATRIX */}
      {activeTab === 'master' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                All Classes Master Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Bird’s-eye view of schedules across all 11 classes for any given day.
              </p>
            </div>

            {/* Select Day for Master Matrix */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Filter Day:</span>
              <select
                value={selectedDay === 'All' ? 'Monday' : selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2.5 border-r border-slate-200 min-w-[100px]">Class / Stage</th>
                  {STANDARD_PERIODS.filter(p => !p.isBreak).map(p => (
                    <th key={p.label} className="p-2.5 border-r border-slate-200 min-w-[140px] text-center">
                      <div>{p.label}</div>
                      <div className="text-[10px] font-mono font-normal text-slate-500">{p.start}-{p.end}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classes.map(cls => {
                  const dayForMatrix = selectedDay === 'All' ? 'Monday' : selectedDay;
                  const classDaySlots = allMasterSlots.filter(
                    s => s.class_grade === cls.name && s.day_of_week === dayForMatrix
                  );

                  return (
                    <tr key={cls.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50">
                        <button
                          onClick={() => {
                            setSelectedClass(cls.name);
                            setActiveTab('grid');
                          }}
                          className="hover:text-brand-600 hover:underline text-left block"
                        >
                          <div>{cls.name}</div>
                          <div className="text-[10px] font-normal text-slate-400">{cls.room}</div>
                        </button>
                      </td>

                      {STANDARD_PERIODS.filter(p => !p.isBreak).map(p => {
                        const slot = classDaySlots.find(s => s.start_time === p.start);
                        const badge = slot ? getSubjectBadgeStyle(slot.subject_name) : null;

                        return (
                          <td key={p.label} className="p-2 border-r border-slate-200 align-top">
                            {slot ? (
                              <div className={`p-1.5 rounded-lg border ${badge.bg} text-[11px] space-y-0.5`}>
                                <strong className="font-bold block leading-tight truncate">
                                  {slot.subject_name}
                                </strong>
                                <div className="text-[10px] opacity-75 truncate">{slot.teacher_name}</div>
                                <div className="text-[9.5px] font-mono opacity-60 truncate">{slot.room}</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic block text-center py-2">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
