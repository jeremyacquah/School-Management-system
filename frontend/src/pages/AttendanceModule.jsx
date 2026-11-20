import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  CalendarCheck2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Filter,
  Calendar,
  AlertCircle,
  Edit2,
  UserPlus,
  Plus,
  Sparkles,
  Check,
  RefreshCw,
  Building,
  GraduationCap,
  Search,
  Phone,
  UserCheck,
  ArrowRight,
  Key,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

export const STANDARD_CLASSES = [
  'KG 1',
  'KG 2',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'JHS 1',
  'JHS 2',
  'JHS 3'
];

export const STANDARD_TERMS = [
  { id: '1', term_name: 'Term 1' },
  { id: '2', term_name: 'Term 2' },
  { id: '3', term_name: 'Term 3' }
];

export const AttendanceModule = () => {
  const { role, isAdmin, isUser, isParent, user } = useAuth();

  // Sub Tab: 'roll_call' vs 'class_grade'
  const [activeSubTab, setActiveSubTab] = useState('class_grade');

  const [terms, setTerms] = useState(STANDARD_TERMS);
  const [weeks, setWeeks] = useState([]);
  const [classes] = useState(STANDARD_CLASSES);
  const [allStudents, setAllStudents] = useState([]);
  const [classCounts, setClassCounts] = useState({});

  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [selectedClass, setSelectedClass] = useState('KG 1');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoMarkAbsent, setAutoMarkAbsent] = useState(true);

  // Class/Grade Tab: active selected class (or 'ALL')
  const [viewClass, setViewClass] = useState('KG 1');
  const [classSearchTerm, setClassSearchTerm] = useState('');

  // Daily Roll Call attendance grid state
  const [childStudent, setChildStudent] = useState(null);
  const [attendanceGrid, setAttendanceGrid] = useState({});
  const [savedRecords, setSavedRecords] = useState([]);
  const [stats, setStats] = useState({ total_days: 0, present_count: 0, absent_count: 0, percentage: 100 });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Admin edit modal
  const [editingRecord, setEditingRecord] = useState(null);

  // Add New Student modal state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(null);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    class_grade: 'KG 1',
    gender: 'Male',
    admission_number: '',
    parent_name: '',
    parent_phone: '',
    parent_access_code: ''
  });
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');

  useEffect(() => {
    loadMetadata();
    loadAllStudents();
  }, []);

  useEffect(() => {
    if (selectedTerm) {
      loadWeeks(selectedTerm);
    }
  }, [selectedTerm]);

  useEffect(() => {
    loadClassStudentsAndAttendance();
  }, [selectedClass, selectedDate, selectedTerm, selectedWeek, role]);

  const loadAllStudents = async () => {
    try {
      const res = await apiClient.get('/students');
      if (isParent) {
        if (res.data && res.data.length > 0) {
          setChildStudent(res.data[0]);
        }
        return;
      }
      const stds = (res.data || []).filter(s => STANDARD_CLASSES.includes(s.class_grade));
      setAllStudents(stds);

      const counts = {};
      STANDARD_CLASSES.forEach(c => { counts[c] = 0; });
      stds.forEach(s => {
        if (s.class_grade) {
          counts[s.class_grade] = (counts[s.class_grade] || 0) + 1;
        }
      });
      setClassCounts(counts);
    } catch (err) {
      console.warn('Error loading students:', err);
    }
  };

  const loadMetadata = async () => {
    try {
      const tRes = await apiClient.get('/terms');
      if (tRes.data && tRes.data.length > 0) {
        setTerms(tRes.data);
        const activeTerm = tRes.data.find(t => t.is_active) || tRes.data[0];
        setSelectedTerm(String(activeTerm.id));
      }
    } catch (e) {
      console.warn('Metadata load fallback:', e);
    }
  };

  const loadWeeks = async (termId) => {
    try {
      const wRes = await apiClient.get('/weeks', { term_id: termId });
      let weeksList = wRes.data || [];

      if (weeksList.length < 15) {
        const generated = [];
        for (let i = 1; i <= 15; i++) {
          const found = weeksList.find(w => w.week_number === i);
          if (found) {
            generated.push(found);
          } else {
            generated.push({
              id: String(i),
              week_number: i,
              week_title: `Week ${i}`,
              is_current: i === 1 ? 1 : 0
            });
          }
        }
        weeksList = generated;
      }

      setWeeks(weeksList);

      if (weeksList.length > 0) {
        setSelectedWeek(prev => {
          const exists = weeksList.some(w => String(w.id) === String(prev) || String(w.week_number) === String(prev));
          if (exists) return prev;
          const curr = weeksList.find(w => w.is_current) || weeksList[0];
          return String(curr.id || curr.week_number);
        });
      }
    } catch (e) {
      console.warn('Weeks fallback to 1-15:', e);
      const fallbackWeeks = Array.from({ length: 15 }, (_, i) => ({
        id: String(i + 1),
        week_number: i + 1,
        week_title: `Week ${i + 1}`,
        is_current: i === 0 ? 1 : 0
      }));
      setWeeks(fallbackWeeks);
    }
  };

  const loadClassStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      if (isParent) {
        const [attRes, statsRes, stdRes] = await Promise.all([
          apiClient.get('/attendance', {
            term_id: selectedTerm,
            week_id: selectedWeek,
          }),
          apiClient.get('/attendance/stats', { term_id: selectedTerm }),
          apiClient.get('/students')
        ]);
        setSavedRecords(attRes.data || []);
        setStats(statsRes.data || {});
        if (stdRes.data && stdRes.data.length > 0) {
          setChildStudent(stdRes.data[0]);
        }
        setLoading(false);
        return;
      }

      // Strictly load students belonging to selectedClass
      const [stdRes, attRes] = await Promise.all([
        apiClient.get('/students', { class_grade: selectedClass }),
        apiClient.get('/attendance', {
          term_id: selectedTerm,
          week_id: selectedWeek,
          date: selectedDate,
          class_grade: selectedClass
        })
      ]);

      const stdList = (stdRes.data || []).filter(s => s.class_grade === selectedClass);
      const records = attRes.data || [];

      setSavedRecords(records);

      // Pre-fill attendance grid for daily roll call
      const grid = {};
      const recordMap = new Map(records.map(r => [r.student_id, r]));

      stdList.forEach(s => {
        if (recordMap.has(s.id)) {
          const r = recordMap.get(s.id);
          grid[s.id] = { status: r.status, remarks: r.remarks || '' };
        } else {
          grid[s.id] = { status: 'present', remarks: '' };
        }
      });
      setAttendanceGrid(grid);

      const statsRes = await apiClient.get('/attendance/stats', { term_id: selectedTerm });
      setStats(statsRes.data || {});
    } catch (e) {
      console.warn('Attendance load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        status
      }
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        remarks
      }
    }));
  };

  const handleMarkAll = (status) => {
    const classStudents = allStudents.filter(s => s.class_grade === selectedClass);
    const updated = {};
    classStudents.forEach(s => {
      updated[s.id] = {
        ...(attendanceGrid[s.id] || {}),
        status
      };
    });
    setAttendanceGrid(updated);
  };

  // Submit Daily Attendance (User or Admin)
  const handleSubmitAttendance = async () => {
    setStatusMsg('');
    try {
      const records = Object.keys(attendanceGrid).map(sId => ({
        student_id: Number(sId),
        status: attendanceGrid[sId].status,
        remarks: attendanceGrid[sId].remarks
      }));

      const res = await apiClient.post('/attendance/batch', {
        term_id: Number(selectedTerm),
        week_id: Number(selectedWeek),
        date: selectedDate,
        class_grade: selectedClass,
        records,
        auto_mark_absent: autoMarkAbsent
      }, { module: 'attendance' });

      setStatusMsg(res.data.message || 'Attendance saved successfully.');
      await loadClassStudentsAndAttendance();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  // Open Add Student Modal
  const openAddStudentModal = (targetClass = viewClass !== 'ALL' ? viewClass : 'KG 1') => {
    const cleanCls = targetClass.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewStudentForm({
      name: '',
      class_grade: targetClass,
      gender: 'Male',
      admission_number: `SCH-${cleanCls}-${randomId}`,
      parent_name: '',
      parent_phone: '',
      parent_access_code: randomPin
    });
    setAddStudentError('');
    setIsAddStudentOpen(true);
  };

  const regenerateAdmissionNumber = () => {
    const cleanCls = newStudentForm.class_grade.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setNewStudentForm(prev => ({
      ...prev,
      admission_number: `SCH-${cleanCls}-${randomId}`
    }));
  };

  const regenerateParentPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewStudentForm(prev => ({
      ...prev,
      parent_access_code: pin
    }));
  };

  const handleCopyParentCredentials = (student) => {
    const pin = student.parent_access_code || '123456';
    const textToCopy = `GREENWOOD ACADEMY - PARENT PORTAL LOGIN\nStudent: ${student.first_name} ${student.last_name}\nAdmission No: ${student.admission_number}\nClass: ${student.class_grade}\nParent PIN (Password): ${pin}\nLogin Portal: Select "Parent Portal" and enter Student Name or Admission No + Parent PIN.`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedStudentId(student.id);
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2500);
  };

  // Create New Student (Admin & Staff)
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudentForm.name.trim()) {
      setAddStudentError('Student Name is required.');
      return;
    }

    setIsSubmittingStudent(true);
    setAddStudentError('');

    try {
      const targetClass = newStudentForm.class_grade;
      const res = await apiClient.post('/students', {
        name: newStudentForm.name.trim(),
        class_grade: targetClass,
        gender: newStudentForm.gender,
        admission_number: newStudentForm.admission_number.trim(),
        parent_name: newStudentForm.parent_name.trim(),
        parent_phone: newStudentForm.parent_phone.trim(),
        parent_access_code: (newStudentForm.parent_access_code || '').trim()
      });

      const parentPin = res.data?.parent_access_code || newStudentForm.parent_access_code;
      setIsAddStudentOpen(false);
      setStatusMsg(`Student "${newStudentForm.name}" registered in ${targetClass}! Parent Password: ${parentPin}`);
      setTimeout(() => setStatusMsg(''), 6000);

      // Re-fetch all students so they immediately appear in the class
      await loadAllStudents();

      // Ensure the view switches to that class so user sees the student right there
      setViewClass(targetClass);
      setSelectedClass(targetClass);
    } catch (err) {
      setAddStudentError(err.message || 'Failed to register student.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Admin edit single record
  const handleSaveAdminEdit = async () => {
    if (!editingRecord || !isAdmin) return;
    try {
      await apiClient.put(`/attendance/${editingRecord.id}`, {
        status: editingRecord.status,
        remarks: editingRecord.remarks
      });
      setEditingRecord(null);
      setStatusMsg('Record updated by administrator.');
      await loadClassStudentsAndAttendance();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Admin Edit Failed: ${err.message}`);
    }
  };

  // Switch to Daily Attendance for a specific class
  const handleGoToRollCall = (clsName) => {
    setSelectedClass(clsName);
    setActiveSubTab('roll_call');
  };

  // Grouped students strictly by class (from KG 1 to JHS 3)
  const studentsByClass = useMemo(() => {
    const map = {};
    STANDARD_CLASSES.forEach(cls => {
      map[cls] = [];
    });
    allStudents.forEach(s => {
      if (map[s.class_grade]) {
        map[s.class_grade].push(s);
      }
    });
    return map;
  }, [allStudents]);

  if (isParent) {
    return (
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Child Attendance Record</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official attendance logs for your enrolled child at Greenwood Academy • Read-only access
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
            🔒 Verified Parent Portal
          </span>
        </div>

        {/* Student Identification & Stats Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Enrolled Student</span>
            <h1 className="text-2xl font-black text-slate-900">
              {childStudent ? `${childStudent.first_name} ${childStudent.last_name}` : 'Student Record'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span>Admission No: <strong className="font-mono text-slate-900">{childStudent?.admission_number || 'N/A'}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Class: <strong className="text-slate-900">{childStudent?.class_grade || 'Class'}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Parent: <strong className="text-slate-900">{childStudent?.parent_name || user?.full_name}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
              <span className="text-2xl font-black text-emerald-600">{stats.percentage || 100}%</span>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-xs space-y-0.5 text-slate-600">
              <div>Present: <strong className="text-emerald-700">{stats.present_count || 0} days</strong></div>
              <div>Absent: <strong className="text-rose-700">{stats.absent_count || 0} days</strong></div>
            </div>
          </div>
        </div>

        {/* Term & Week Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">Academic Term:</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 outline-none"
              >
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.term_name || `Term ${t.id}`}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">School Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 outline-none"
              >
                <option value="all">All Weeks</option>
                {weeks.map(w => (
                  <option key={w.id || w.week_number} value={w.id || w.week_number}>
                    Week {w.week_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-slate-500 font-medium">
            Showing {savedRecords.length} recorded session(s)
          </span>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">Attendance Activity Log</span>
            <span className="text-slate-500 font-semibold">{savedRecords.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">School Week</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{r.date}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Week {r.week_number}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        r.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : r.status === 'absent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : r.status === 'late'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {r.status === 'present' && '✓'}
                        {r.status === 'absent' && '✗'}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.recorded_by || 'Class Teacher'}</td>
                    <td className="py-3 px-4 text-slate-600 italic">{r.remarks || '-'}</td>
                  </tr>
                ))}

                {savedRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 italic">
                      No attendance records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Attendance & Class Roster</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse by Class/Grade (KG 1 to JHS 3) or record Daily Attendance by Academic Term and School Week.
          </p>
        </div>

        {/* Global Attendance Health Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Term Rate</span>
            <span className="text-lg font-extrabold text-emerald-600">{stats.percentage || 98.5}%</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs under Attendance: Class/Grade vs Daily Roll Call */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 pt-2 rounded-xl shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('class_grade')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'class_grade'
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Building className="w-4 h-4" />
          <span>Class/Grade</span>
          <span className="bg-brand-50 text-brand-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            KG 1 – JHS 3
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roll_call')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'roll_call'
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>Daily Roll Call</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm ${statusMsg.includes('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
          {statusMsg.includes('Error') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CLASS/GRADE (KG 1 TO JHS 3 WITH ONLY STUDENTS IN THAT CLASS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'class_grade' && (
        <div className="space-y-4">
          {/* Class Switcher Navigation: KG 1 to JHS 3 */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Class / Grade (KG 1 to JHS 3):
              </span>
              <button
                type="button"
                onClick={() => setViewClass('ALL')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${viewClass === 'ALL'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                View All Classes (KG 1 – JHS 3)
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STANDARD_CLASSES.map(clsName => {
                const isSelected = viewClass === clsName;
                const count = classCounts[clsName] || 0;

                return (
                  <button
                    key={clsName}
                    type="button"
                    onClick={() => {
                      setViewClass(clsName);
                      setClassSearchTerm('');
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isSelected
                      ? 'bg-navy-800 text-white ring-2 ring-brand-500 shadow-md'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                  >
                    <span>{clsName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isSelected
                      ? 'bg-brand-500 text-white'
                      : count > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classes to display (either the single selected class, or all classes if viewClass === 'ALL') */}
          {(viewClass === 'ALL' ? STANDARD_CLASSES : [viewClass]).map(clsName => {
            const rawStudents = studentsByClass[clsName] || [];
            // Filter within this class if searching
            const studentsInClass = rawStudents.filter(s => {
              if (!classSearchTerm.trim()) return true;
              const q = classSearchTerm.toLowerCase();
              const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
              const adm = (s.admission_number || '').toLowerCase();
              const parent = (s.parent_name || '').toLowerCase();
              return name.includes(q) || adm.includes(q) || parent.includes(q);
            });

            return (
              <div key={clsName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Clean Class Name Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-800 text-white font-extrabold flex items-center justify-center text-sm shadow">
                      {clsName.replace('Class ', 'C').replace(' ', '')}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                        <span>{clsName}</span>
                        <span className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-0.5 rounded-full font-bold">
                          {rawStudents.length} {rawStudents.length === 1 ? 'Student' : 'Students'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Only students registered in {clsName}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this class */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddStudentModal(clsName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Student to {clsName}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGoToRollCall(clsName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
                      title="Take daily attendance for this class"
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>Roll Call</span>
                    </button>
                  </div>
                </div>

                {/* Only students in this class */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Admission No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Class/Grade</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3">Parent / Guardian</th>
                        <th className="py-2.5 px-3">Contact Phone</th>
                        <th className="py-2.5 px-3 text-center">Parent Password (PIN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsInClass.map((s, idx) => {
                        const pin = s.parent_access_code || '123456';
                        const isCopied = copiedStudentId === s.id;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.admission_number}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{s.first_name} {s.last_name}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-navy-50 text-navy-800 font-extrabold text-[11px] px-2 py-0.5 rounded-lg border border-navy-200">
                                {s.class_grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${s.gender?.toLowerCase() === 'male' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                                s.gender?.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-800 border border-pink-200' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                {s.gender || 'Other'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">{s.parent_name || 'Parent / Guardian'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {s.parent_phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{s.parent_phone}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <span className="font-mono font-extrabold text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg tracking-wider shadow-xs">
                                  {pin}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyParentCredentials(s)}
                                  className={`p-1 rounded transition-colors ${isCopied
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                                  title="Copy credentials for parent"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {studentsInClass.length === 0 && (
                        <tr>
                          <td colSpan="7" className="py-8 text-center">
                            <div className="max-w-xs mx-auto text-center space-y-1.5">
                              <Users className="w-6 h-6 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold text-slate-700">No students in {clsName} yet.</p>
                              <button
                                type="button"
                                onClick={() => openAddStudentModal(clsName)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-colors mt-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Student to {clsName}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DAILY ROLL CALL */}
      {/* ========================================================================= */}
      {activeSubTab === 'roll_call' && (
        <div className="space-y-4">
          {/* Week & Term Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* 1. Academic Term (Term 1, Term 2, Term 3) */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>Academic Term</span>
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.term_name || `Term ${t.id}`} {t.session_year ? `(${t.session_year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. School Week (Week 1 to Week 15) */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>School Week</span>
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {weeks.map(w => (
                  <option key={w.id || w.week_number} value={w.id || w.week_number}>
                    Week {w.week_number} {w.week_title && w.week_title !== `Week ${w.week_number}` ? `- ${w.week_title.replace(`Week ${w.week_number} - `, '')}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Class / Grade (KG 1 to JHS 3) */}
            {!isParent && (
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <span>Class / Grade</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  {STANDARD_CLASSES.map(clsName => {
                    const count = classCounts[clsName] || 0;
                    return (
                      <option key={clsName} value={clsName}>
                        {clsName} ({count} {count === 1 ? 'student' : 'students'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* 4. Date */}
            {!isParent && (
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Roll Call Date</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* PARENT VIEW */}
          {isParent ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Child Attendance Log
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-bold">
                  Parent Read-Only
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Week</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savedRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{r.date}</td>
                        <td className="py-2.5 px-3 text-slate-600">Week {r.week_number}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${r.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                              r.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{r.recorded_by}</td>
                        <td className="py-2.5 px-3 text-slate-500 italic">{r.remarks || '-'}</td>
                      </tr>
                    ))}
                    {savedRecords.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">No attendance records found for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* STAFF & ADMIN VIEW: Interactive Input Matrix */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-5">
              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-slate-900">{selectedClass} Daily Roll Call</span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {(studentsByClass[selectedClass] || []).length} {studentsByClass[selectedClass]?.length === 1 ? 'student' : 'students'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAddStudentModal(selectedClass)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add New Student</span>
                  </button>

                  <label className="flex items-center gap-2 text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoMarkAbsent}
                      onChange={(e) => setAutoMarkAbsent(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium text-slate-700">Auto-Mark Absent</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleMarkAll('present')}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
                  >
                    Mark All Present
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    disabled={loading || (studentsByClass[selectedClass] || []).length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Attendance</span>
                  </button>
                </div>
              </div>

              {/* Student Grid Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-800 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Status Selection</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      {isAdmin && <th className="py-2.5 px-2 text-center">Admin Edit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(studentsByClass[selectedClass] || []).map((s, idx) => {
                      const currentStatus = attendanceGrid[s.id]?.status || 'present';
                      const currentRemarks = attendanceGrid[s.id]?.remarks || '';
                      const saved = savedRecords.find(r => r.student_id === s.id);

                      return (
                        <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{s.admission_number}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{s.first_name} {s.last_name}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                              {['present', 'absent', 'late', 'excused'].map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(s.id, st)}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${currentStatus === st
                                    ? st === 'present' ? 'bg-emerald-600 text-white shadow' :
                                      st === 'absent' ? 'bg-rose-600 text-white shadow' :
                                        st === 'late' ? 'bg-amber-600 text-white shadow' : 'bg-blue-600 text-white shadow'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Optional remarks (e.g. sick, permission)"
                              value={currentRemarks}
                              onChange={(e) => handleRemarksChange(s.id, e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 text-xs px-1 py-0.5 outline-none"
                            />
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 px-2 text-center">
                              {saved ? (
                                <button
                                  onClick={() => setEditingRecord(saved)}
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                  title="Administrator permission: Edit past attendance record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {(studentsByClass[selectedClass] || []).length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                          <div className="max-w-xs mx-auto text-center space-y-2">
                            <Users className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-semibold text-slate-700">No students registered in {selectedClass} yet.</p>
                            <p className="text-[11px] text-slate-400">Add students to {selectedClass} to begin taking daily attendance.</p>
                            <button
                              type="button"
                              onClick={() => openAddStudentModal(selectedClass)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-colors mt-2"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>+ Add Student to {selectedClass}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW STUDENT MODAL (ADMIN & STAFF) */}
      {/* ========================================================================= */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-navy-800 to-indigo-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Add New Student</h3>
                  <p className="text-[11px] text-slate-300">
                    Register student into their rightful class: <strong>{newStudentForm.class_grade}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStudent} className="p-5 space-y-3.5 text-xs">
              {addStudentError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {addStudentError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kofi Mensah or Abena Osei"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Class / Grade <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStudentForm.class_grade}
                    onChange={(e) => {
                      const nextClass = e.target.value;
                      const cleanCls = nextClass.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                      const randomId = Math.floor(1000 + Math.random() * 9000);
                      setNewStudentForm({
                        ...newStudentForm,
                        class_grade: nextClass,
                        admission_number: `SCH-${cleanCls}-${randomId}`
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                  >
                    {STANDARD_CLASSES.map(clsName => (
                      <option key={clsName} value={clsName}>{clsName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender</label>
                  <select
                    value={newStudentForm.gender}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, gender: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Admission / ID Number</label>
                  <button
                    type="button"
                    onClick={regenerateAdmissionNumber}
                    className="text-[11px] text-brand-600 hover:underline font-semibold"
                  >
                    Regenerate ID
                  </button>
                </div>
                <input
                  type="text"
                  value={newStudentForm.admission_number}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, admission_number: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="e.g. SCH-KG1-1024"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Unique Parent Password (PIN)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={regenerateParentPin}
                    className="text-[11px] text-brand-600 hover:underline font-semibold"
                  >
                    Regenerate PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={newStudentForm.parent_access_code}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, parent_access_code: e.target.value })}
                  className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-3 py-2 text-xs font-mono font-bold tracking-widest text-amber-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="e.g. 482910"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Unique 6-digit PIN for parent login. The parent logs in with this PIN to view strictly this student's records.
                </p>
              </div>

              {/* Optional Guardian Contact details */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">Guardian Contact (Optional)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Parent/Guardian Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Kwesi Mensah"
                      value={newStudentForm.parent_name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, parent_name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 0244123456"
                      value={newStudentForm.parent_phone}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, parent_phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1.5"
                >
                  {isSubmittingStudent ? 'Registering...' : 'Save & Add to Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT MODAL */}
      {editingRecord && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Admin Attendance Edit</h3>
            <div className="text-xs text-slate-500 space-y-1">
              <p>Student: <strong>{editingRecord.first_name} {editingRecord.last_name}</strong></p>
              <p>Date: <strong>{editingRecord.date}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={editingRecord.status}
                onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
              <input
                type="text"
                value={editingRecord.remarks || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdminEdit}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
              >
                Save Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceModule;
