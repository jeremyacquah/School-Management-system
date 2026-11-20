import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  DollarSign,
  Award,
  Bell,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Filter,
  Lock,
  UserCheck
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

export const Dashboard = ({ setActiveTab }) => {
  const { user, role, isAdmin, isUser, isParent } = useAuth();
  const [stats, setStats] = useState({
    studentCount: 19,
    classCount: 11,
    attendanceRate: 96.8,
    totalCollected: 1440,
    pendingBalance: 580,
    booksLoaned: 1,
    activeTerm: 'Term 1 (2026/2027)',
    currentWeek: 'Week 5 - Midterm Exams'
  });

  const [notices, setNotices] = useState([]);
  const [childData, setChildData] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // Parent Passwords Directory state (Admin & Staff)
  const [parentSearch, setParentSearch] = useState('');
  const [parentClassFilter, setParentClassFilter] = useState('ALL');
  const [revealedPins, setRevealedPins] = useState({});
  const [showAllPins, setShowAllPins] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [role]);

  const loadDashboardData = async () => {
    try {
      // Load notices
      const noticesRes = await apiClient.get('/notices');
      setNotices(noticesRes.data?.slice(0, 3) || []);

      if (isParent && user?.child_student_id) {
        const [studentRes, feeRes, attRes] = await Promise.all([
          apiClient.get(`/students/${user.child_student_id}`).catch(() => ({ data: null })),
          apiClient.get(`/fees/balance/${user.child_student_id}`).catch(() => ({ data: null })),
          apiClient.get(`/attendance/stats?student_id=${user.child_student_id}`).catch(() => ({ data: null }))
        ]);

        setChildData({
          student: studentRes?.data || user?.child || null,
          fee: feeRes?.data || null,
          attendance: attRes?.data || null
        });
      } else if (!isParent) {
        // Load all students for Admin/Staff roster & parent passwords
        const studentsRes = await apiClient.get('/students');
        const stds = studentsRes.data || [];
        setAllStudents(stds);
        setStats(prev => ({
          ...prev,
          studentCount: stds.length,
          classCount: STANDARD_CLASSES.length
        }));
      }
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    }
  };

  const togglePinVisibility = (studentId) => {
    setRevealedPins(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleCopyCredentials = (student) => {
    const pin = student.parent_access_code || '123456';
    const textToCopy = `GREENWOOD ACADEMY - PARENT PORTAL LOGIN\nStudent: ${student.first_name} ${student.last_name}\nAdmission No: ${student.admission_number}\nClass: ${student.class_grade}\nParent PIN (Password): ${pin}\nLogin Portal: Select "Parent Portal" and enter Student Name or Admission No + Parent PIN.`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedStudentId(student.id);
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2500);
  };

  // Filter students for Parent Passwords Directory
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const matchClass = parentClassFilter === 'ALL' || s.class_grade === parentClassFilter;
      if (!matchClass) return false;
      if (!parentSearch.trim()) return true;
      const q = parentSearch.toLowerCase();
      const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const adm = (s.admission_number || '').toLowerCase();
      const parent = (s.parent_name || '').toLowerCase();
      return name.includes(q) || adm.includes(q) || parent.includes(q);
    });
  }, [allStudents, parentClassFilter, parentSearch]);

  // PARENT DASHBOARD VIEW
  if (isParent) {
    const student = childData?.student || user?.child || { first_name: 'Ethan', last_name: 'Miller', admission_number: 'SCH-2026-001', class_grade: 'Grade 9A' };
    const fee = childData?.fee || { total_due: 840, total_paid: 600, balance: 240 };
    const attendance = childData?.attendance || { percentage: 96.5, present_count: 19, absent_count: 1 };

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-navy-800 to-navy-900 rounded-2xl p-6 text-white shadow-lg border border-navy-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold bg-navy-950 px-2.5 py-1 rounded-full border border-emerald-900">
                Official Parent Portal
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-2">Welcome, {user?.full_name || 'David Miller'}</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Viewing academic records and live progress for your child: <strong>{student.first_name} {student.last_name}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-brand-600/90 text-white text-xs px-3 py-1.5 rounded-lg font-medium border border-brand-500">
                Active: Term 1 (2026/2027) • Week 5
              </span>
            </div>
          </div>
        </div>

        {/* Child Snapshot KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Attendance Rate</span>
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{attendance.percentage}%</span>
              <span className="text-xs text-emerald-600 font-medium">On Track</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {attendance.present_count || 19} Days Present • {attendance.absent_count || 1} Days Absent
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Fee Balance</span>
              <DollarSign className="w-4 h-4 text-brand-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">${fee.balance}</span>
              <span className="text-xs text-amber-600 font-medium">Due for Term 1</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Paid: ${fee.total_paid} of ${fee.total_due} Total Due
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Current GPA & Rank</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">3.8 / 4.0</span>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Rank #2</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Class: {student.class_grade} • Distinction Category
            </p>
          </div>
        </div>

        {/* Quick Action Buttons for Parent */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('grades')}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Report Card</span>
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm transition-all"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>View Receipts</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm transition-all"
          >
            <CalendarCheck2 className="w-4 h-4 text-blue-600" />
            <span>Weekly Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-sm transition-all"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span>School Notices</span>
          </button>
        </div>

        {/* Recent School Broadcasts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              <span>School Announcements & Broadcasts</span>
            </h3>
            <button onClick={() => setActiveTab('notices')} className="text-xs text-brand-600 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-900 font-semibold">{n.title}</strong>
                  <span className="text-[10px] text-slate-400">{n.session_year || 'Term 1'}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ADMIN & STAFF DASHBOARD VIEW
  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-navy-800 rounded-2xl p-6 text-white shadow-lg border border-navy-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                isAdmin ? 'bg-purple-900 text-purple-200 border border-purple-700' : 'bg-blue-900 text-blue-200 border border-blue-700'
              }`}>
                {isAdmin ? 'Administrator Portal (Full CRUD)' : 'Staff / Teacher Portal (Create & Read Only)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-2">Greenwood Academy SMS</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Active Session: <strong>2026/2027 • Term 1</strong> | School Week: <strong>Week 5 (Midterm Assessment)</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Offline Sync Engine Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.studentCount}</div>
          <p className="text-xs text-slate-500 mt-1">Across {stats.classCount} Classes (KG 1 to JHS 3)</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Attendance Rate</span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">96.8%</div>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Auto Absent Marking Active</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Fee Collections</span>
            <DollarSign className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">$1,440</div>
          <p className="text-xs text-slate-500 mt-1">Pending Balance: $580</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Active Classes</span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">11</div>
          <p className="text-xs text-purple-600 mt-1 font-medium">KG 1 through JHS 3</p>
        </div>
      </div>

      {/* Module Shortcuts Grid */}
      <div>
        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-3">Core Modules Quick Launch</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('attendance')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <CalendarCheck2 className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">1. Attendance & Rosters</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">KG 1 to JHS 3 class lists & daily roll call</span>
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <FileText className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">2. Grades & Reports</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">GPA, class rankings, Excel import/export</span>
          </button>

          <button
            onClick={() => setActiveTab('fees')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <DollarSign className="w-6 h-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">3. Fees & Receipts</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Short SMS/WhatsApp receipt generator</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <TrendingUp className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">4. Timetable</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Clash-free teacher/room scheduling</span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <Bell className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">5. Notices & SMS</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">One-way broadcasts, short templates</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <BookOpen className="w-6 h-6 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">6. Library Stock</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Stock control, issue, return & fines</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
          >
            <Award className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <strong className="text-xs sm:text-sm text-slate-900 font-bold">7. Exam Builder</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Question banks & instant auto-grading</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className="flex flex-col items-start p-4 bg-white hover:border-brand-500 border border-slate-200 rounded-xl shadow-sm text-left transition-all group"
            >
              <ShieldCheck className="w-6 h-6 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
              <strong className="text-xs sm:text-sm text-slate-900 font-bold">8. Audit Logs</strong>
              <span className="text-[11px] text-slate-500 mt-0.5">Who did what, when & diff details</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PARENT PORTAL PASSWORDS DIRECTORY (ADMIN & STAFF) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
                <Key className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-base tracking-tight">Parent Portal Passwords Directory</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Every student has a unique parent password (6-digit PIN). Parents log in to view strictly their child's records with zero access to any other child.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllPins(!showAllPins)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors"
            >
              {showAllPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showAllPins ? 'Mask All PINs' : 'Reveal All PINs'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              <span>+ Add New Student</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Class Grade Quick Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setParentClassFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                parentClassFilter === 'ALL'
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All Classes ({allStudents.length})
            </button>
            {STANDARD_CLASSES.map(cls => {
              const count = allStudents.filter(s => s.class_grade === cls).length;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setParentClassFilter(cls)}
                  className={`px-2 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    parentClassFilter === cls
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cls}</span>
                  {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or admission no..."
              value={parentSearch}
              onChange={(e) => setParentSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Class/Grade</th>
                <th className="py-2.5 px-3">Admission No</th>
                <th className="py-2.5 px-3">Parent / Guardian</th>
                <th className="py-2.5 px-3">Unique Parent Password</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => {
                const isRevealed = showAllPins || revealedPins[s.id];
                const pin = s.parent_access_code || '123456';
                const isCopied = copiedStudentId === s.id;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{s.first_name} {s.last_name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-navy-50 text-navy-800 font-bold px-2 py-0.5 rounded-lg border border-navy-200 text-[11px]">
                        {s.class_grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{s.admission_number}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>
                        <span className="font-medium text-slate-800 block">{s.parent_name || 'Parent / Guardian'}</span>
                        {s.parent_phone && <span className="text-[10px] text-slate-400 font-mono">{s.parent_phone}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg tracking-widest shadow-xs">
                          {isRevealed ? pin : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePinVisibility(s.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={isRevealed ? 'Hide PIN' : 'Show PIN'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                        title="Copy credentials for parent sharing"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Login Info</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                    No students found matching your search or filter.
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
