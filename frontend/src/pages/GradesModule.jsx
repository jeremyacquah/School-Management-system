import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ReportCardModal } from '../components/ReportCardModal';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Award,
  FileText,
  Save,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Users,
  Search,
  CheckCircle,
  FolderPlus,
  Layers,
  ChevronRight,
  Filter,
  Sparkles,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to calculate grade letter and GPA point
const calculateGrade = (assign = 0, quiz = 0, mid = 0, exam = 0) => {
  const total = Number(assign) + Number(quiz) + Number(mid) + Number(exam);
  let letter = 'F';
  let gpa = 0.0;
  let remark = 'Fail / Needs Attention';

  if (total >= 90) {
    letter = 'A';
    gpa = 4.0;
    remark = 'Excellent (Grade A)';
  } else if (total >= 80) {
    letter = 'B';
    gpa = 3.0;
    remark = 'Very Good (Grade B)';
  } else if (total >= 70) {
    letter = 'C';
    gpa = 2.0;
    remark = 'Credit / Satisfactory (Grade C)';
  } else if (total >= 60) {
    letter = 'D';
    gpa = 1.0;
    remark = 'Pass (Grade D)';
  }

  return { total, letter, gpa, remark };
};

export const GradesModule = () => {
  const { role, isAdmin, isUser, isParent, user } = useAuth();

  const [terms, setTerms] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // Selected filters
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedWeek, setSelectedWeek] = useState('5');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Active view: 'input' | 'subjects' | 'rankings' | 'transcript' | 'report_card'
  const [viewMode, setViewMode] = useState(isParent ? 'report_card' : 'input');
  const [groupByClass, setGroupByClass] = useState(true);

  // Grades table data
  const [gradesList, setGradesList] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [transcriptData, setTranscriptData] = useState(null);

  // Grade Entry Form state
  const [entryClass, setEntryClass] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    assignment_score: 18,
    quiz_score: 17,
    midterm_score: 19,
    exam_score: 36,
    teacher_comment: ''
  });

  // Subjects Tab state
  const [subjectFilterClass, setSubjectFilterClass] = useState('all');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectData, setNewSubjectData] = useState({
    name: '',
    code: '',
    class_grade: '',
    teacher_name: ''
  });
  const [editingSubject, setEditingSubject] = useState(null);

  // Report Card Modal State
  const [reportCardData, setReportCardData] = useState(null);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);

  // Admin edit grade modal
  const [editingGrade, setEditingGrade] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (selectedTerm) {
      loadWeeks(selectedTerm);
    }
  }, [selectedTerm]);

  useEffect(() => {
    loadGradesAndRankings();
  }, [selectedTerm, selectedClass, selectedSubject, role]);

  // Keep entryClass in sync or default to first class
  useEffect(() => {
    if (classes.length > 0 && !entryClass) {
      const defaultCls = classes[0].name;
      setEntryClass(defaultCls);
      setNewSubjectData(prev => ({ ...prev, class_grade: defaultCls }));
    }
  }, [classes]);

  // When entryClass changes, select first student & first subject of that class
  useEffect(() => {
    if (!entryClass) return;
    const classStudents = allStudents.filter(s => s.class_grade === entryClass);
    if (classStudents.length > 0) {
      setFormData(prev => ({ ...prev, student_id: String(classStudents[0].id) }));
    } else {
      setFormData(prev => ({ ...prev, student_id: '' }));
    }

    const classSubjects = allSubjects.filter(s => s.class_grade === entryClass);
    if (classSubjects.length > 0) {
      setFormData(prev => ({ ...prev, subject_id: String(classSubjects[0].id) }));
    } else if (allSubjects.length > 0) {
      setFormData(prev => ({ ...prev, subject_id: String(allSubjects[0].id) }));
    }
  }, [entryClass, allStudents, allSubjects]);

  const loadMetadata = async () => {
    try {
      const [tRes, cRes, subRes, stdRes] = await Promise.all([
        apiClient.get('/terms'),
        apiClient.get('/students/classes'),
        apiClient.get('/grades/subjects'),
        apiClient.get('/students')
      ]);

      const termsData = tRes.data || [];
      const classesData = cRes.data || [];
      const subjectsData = subRes.data || [];
      const studentsData = stdRes.data || [];

      setTerms(termsData);
      setClasses(classesData);
      setAllSubjects(subjectsData);
      setAllStudents(studentsData);

      if (termsData.length > 0) setSelectedTerm(String(termsData[0].id));
      if (classesData.length > 0) {
        setEntryClass(classesData[0].name);
        setNewSubjectData(prev => ({ ...prev, class_grade: classesData[0].name }));
      }
    } catch (e) {
      console.warn('Metadata load error:', e);
    }
  };

  const loadWeeks = async (termId) => {
    try {
      const wRes = await apiClient.get('/weeks', { term_id: termId });
      setWeeks(wRes.data || []);
      if (wRes.data?.length > 0) setSelectedWeek(String(wRes.data[0].id));
    } catch (e) {
      console.warn('Weeks load error:', e);
    }
  };

  const loadGradesAndRankings = async () => {
    try {
      if (isParent) {
        if (user?.child_student_id) {
          const rcRes = await apiClient.get(`/grades/report-card/${user.child_student_id}`, { term_id: selectedTerm });
          setReportCardData(rcRes.data);

          const rkRes = await apiClient.get('/grades/rankings', {
            term_id: selectedTerm,
            class_grade: rcRes.data?.student?.class_grade || 'JHS 3'
          });
          setRankings(rkRes.data || []);
        }
        return;
      }

      // Load Grades list
      const gRes = await apiClient.get('/grades', {
        term_id: selectedTerm,
        class_grade: selectedClass !== 'all' ? selectedClass : undefined,
        subject_id: selectedSubject !== 'all' ? selectedSubject : undefined
      });
      setGradesList(gRes.data || []);

      // Load Auto Calculated Rankings for selected class
      const targetRankClass = selectedClass !== 'all' ? selectedClass : (classes[0]?.name || 'JHS 3');
      const rankRes = await apiClient.get('/grades/rankings', {
        term_id: selectedTerm,
        class_grade: targetRankClass
      });
      setRankings(rankRes.data || []);
    } catch (e) {
      console.warn('Grades load error:', e);
    }
  };

  // Submit Grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    setStatusMsg('');

    if (!formData.student_id || !formData.subject_id) {
      setStatusMsg('Error: Please select a valid student and subject.');
      return;
    }

    try {
      const res = await apiClient.post('/grades', {
        student_id: Number(formData.student_id),
        subject_id: Number(formData.subject_id),
        term_id: Number(selectedTerm),
        week_id: Number(selectedWeek),
        assignment_score: Number(formData.assignment_score),
        quiz_score: Number(formData.quiz_score),
        midterm_score: Number(formData.midterm_score),
        exam_score: Number(formData.exam_score),
        teacher_comment: formData.teacher_comment
      }, { module: 'grades' });

      setStatusMsg(res.data.message || 'Subject score successfully recorded!');
      loadGradesAndRankings();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  // Admin Edit Grade
  const handleAdminUpdateGrade = async () => {
    if (!editingGrade || !isAdmin) return;
    try {
      await apiClient.put(`/grades/${editingGrade.id}`, {
        assignment_score: editingGrade.assignment_score,
        quiz_score: editingGrade.quiz_score,
        midterm_score: editingGrade.midterm_score,
        exam_score: editingGrade.exam_score,
        teacher_comment: editingGrade.teacher_comment
      });
      setEditingGrade(null);
      setStatusMsg('Grade updated by administrator.');
      loadGradesAndRankings();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Admin Edit Failed: ${err.message}`);
    }
  };

  // Add New Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/grades/subjects', newSubjectData);
      setIsAddSubjectOpen(false);
      setNewSubjectData({
        name: '',
        code: '',
        class_grade: entryClass || classes[0]?.name || 'Class 1',
        teacher_name: ''
      });
      // Refresh subjects
      const subRes = await apiClient.get('/grades/subjects');
      setAllSubjects(subRes.data || []);
      setStatusMsg(`Subject "${newSubjectData.name}" added successfully.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Failed to add subject: ${err.message}`);
    }
  };

  // Edit Existing Subject
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      await apiClient.put(`/grades/subjects/${editingSubject.id}`, editingSubject);
      setEditingSubject(null);
      const subRes = await apiClient.get('/grades/subjects');
      setAllSubjects(subRes.data || []);
      setStatusMsg(`Subject updated successfully.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Failed to update subject: ${err.message}`);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/grades/subjects/${subjectId}`);
      const subRes = await apiClient.get('/grades/subjects');
      setAllSubjects(subRes.data || []);
      setStatusMsg(`Subject "${subjectName}" removed.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Delete Failed: ${err.message}`);
    }
  };

  // Quick shortcut from Subject card to Score input
  const handleQuickEnterScore = (subject) => {
    setEntryClass(subject.class_grade);
    setFormData(prev => ({ ...prev, subject_id: String(subject.id) }));
    setViewMode('input');
  };

  // View Report Card
  const handleViewReportCard = async (studentId) => {
    try {
      const rcRes = await apiClient.get(`/grades/report-card/${studentId}`, { term_id: selectedTerm });
      setReportCardData(rcRes.data);
      setIsReportCardOpen(true);
    } catch (err) {
      alert(`Report Card Error: ${err.message}`);
    }
  };

  // View Transcript
  const handleViewTranscript = async (studentId) => {
    try {
      const tRes = await apiClient.get(`/grades/transcript/${studentId}`);
      setTranscriptData(tRes.data);
      setViewMode('transcript');
    } catch (err) {
      alert(`Transcript Error: ${err.message}`);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportData = gradesList.map(g => ({
      'Admission Number': g.admission_number,
      'Student Name': `${g.first_name} ${g.last_name}`,
      'Class': g.class_grade,
      'Subject': g.subject_name,
      'Assignment (20)': g.assignment_score,
      'Quiz (20)': g.quiz_score,
      'Midterm (20)': g.midterm_score,
      'Final Exam (40)': g.exam_score,
      'Total Score (100)': g.total_score,
      'Grade Letter': g.grade_letter,
      'GPA Point': g.gpa_point,
      'Comments': g.teacher_comment || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');
    XLSX.writeFile(workbook, `Greenwood_Grades_Term${selectedTerm}.xlsx`);
  };

  // Filter students for the entry class
  const entryStudents = useMemo(() => {
    if (!entryClass) return allStudents;
    return allStudents.filter(s => s.class_grade === entryClass);
  }, [allStudents, entryClass]);

  // Filter subjects for the entry class
  const entrySubjects = useMemo(() => {
    if (!entryClass) return allSubjects;
    return allSubjects.filter(s => s.class_grade === entryClass);
  }, [allSubjects, entryClass]);

  // Live calculation for the score entry form
  const liveScore = useMemo(() => {
    return calculateGrade(
      formData.assignment_score,
      formData.quiz_score,
      formData.midterm_score,
      formData.exam_score
    );
  }, [formData.assignment_score, formData.quiz_score, formData.midterm_score, formData.exam_score]);

  // Filtered grades list based on search and filters
  const filteredGrades = useMemo(() => {
    return gradesList.filter(g => {
      const matchesSearch = studentSearch === '' ||
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
        g.admission_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
        g.subject_name.toLowerCase().includes(studentSearch.toLowerCase());
      return matchesSearch;
    });
  }, [gradesList, studentSearch]);

  // Group grades by Class Grade
  const gradesByClass = useMemo(() => {
    const groups = {};
    filteredGrades.forEach(g => {
      const cls = g.class_grade || 'Unassigned';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(g);
    });
    return groups;
  }, [filteredGrades]);

  // Filtered subjects for the Subjects Tab
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter(s => {
      const matchesClass = subjectFilterClass === 'all' || s.class_grade === subjectFilterClass;
      const matchesSearch = subjectSearch === '' ||
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (s.teacher_name && s.teacher_name.toLowerCase().includes(subjectSearch.toLowerCase()));
      return matchesClass && matchesSearch;
    });
  }, [allSubjects, subjectFilterClass, subjectSearch]);

  // Group subjects by Class Grade for the Subjects Tab
  const subjectsByClass = useMemo(() => {
    const groups = {};
    filteredSubjects.forEach(s => {
      const cls = s.class_grade || 'General';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(s);
    });
    return groups;
  }, [filteredSubjects]);

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Grades & Academic Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Subject score entry • School subjects curriculum • Class groupings • Auto GPA & class rankings
          </p>
        </div>

        {/* Toolbar actions */}
        {!isParent && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Grades (.xlsx)</span>
            </button>
            <button
              onClick={() => {
                setIsAddSubjectOpen(true);
                setViewMode('subjects');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Add School Subject</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {!isParent && (
          <>
            <button
              onClick={() => setViewMode('input')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'input'
                  ? 'bg-navy-800 text-white shadow-sm font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Grade Entry & Class Scores</span>
            </button>

            <button
              onClick={() => setViewMode('subjects')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'subjects'
                  ? 'bg-navy-800 text-white shadow-sm font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>School Subjects Offered</span>
              <span className="ml-1 px-1.5 py-0.2 bg-brand-900/60 text-brand-300 rounded-full text-[10px]">
                {allSubjects.length}
              </span>
            </button>
          </>
        )}

        <button
          onClick={() => setViewMode('rankings')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            viewMode === 'rankings'
              ? 'bg-navy-800 text-white shadow-sm font-bold'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Auto Class Rankings & GPA</span>
        </button>

        {isParent && (
          <button
            onClick={() => {
              if (user?.child_student_id) handleViewReportCard(user.child_student_id);
            }}
            className="px-3.5 py-2 rounded-xl bg-brand-600 text-white shadow flex items-center gap-1.5 font-bold"
          >
            <FileText className="w-4 h-4" />
            <span>My Child Official Report Card</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          statusMsg.includes('Error')
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: GRADE ENTRY & GROUPED CLASS SCORES                */}
      {/* ======================================================== */}
      {viewMode === 'input' && !isParent && (
        <div className="space-y-6">
          {/* Grade Entry Form Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Enter New Subject Score</h3>
                  <p className="text-xs text-slate-500">Record assessment and examination points for a student.</p>
                </div>
              </div>

              {/* Term & Week Pickers for Grade Entry */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-500 font-medium">Term:</span>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.term_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-500 font-medium">Week:</span>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none"
                  >
                    {weeks.map(w => (
                      <option key={w.id} value={w.id}>Week {w.week_number}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
              {/* Row 1: Class, Student, Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Class Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    1. Select Class
                  </label>
                  <select
                    value={entryClass}
                    onChange={(e) => setEntryClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Student Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    2. Student's Name ({entryStudents.length} in {entryClass})
                  </label>
                  <select
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {entryStudents.length === 0 && <option value="">No students in {entryClass}</option>}
                    {entryStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} — {s.admission_number}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Subject Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    3. Subject Offered
                  </label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {entrySubjects.length === 0 && <option value="">No subjects configured for {entryClass}</option>}
                    {entrySubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Score Breakdown (Assign, Quiz, Midterm, Exam) + Live Total Card */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Assign <span className="text-slate-400 font-normal">/ 20</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.assignment_score}
                    onChange={(e) => setFormData({ ...formData, assignment_score: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Quiz <span className="text-slate-400 font-normal">/ 20</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.quiz_score}
                    onChange={(e) => setFormData({ ...formData, quiz_score: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Midterm <span className="text-slate-400 font-normal">/ 20</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.midterm_score}
                    onChange={(e) => setFormData({ ...formData, midterm_score: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Exam <span className="text-slate-400 font-normal">/ 40</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={formData.exam_score}
                    onChange={(e) => setFormData({ ...formData, exam_score: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                {/* Real-time Computed Total & Grade Card */}
                <div className="col-span-2 bg-gradient-to-br from-slate-900 to-navy-800 text-white rounded-xl p-3 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">{liveScore.total}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Grade & GPA</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        liveScore.letter === 'A' ? 'bg-emerald-500 text-white' :
                        liveScore.letter === 'B' ? 'bg-blue-500 text-white' :
                        liveScore.letter === 'C' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {liveScore.letter}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-200">{liveScore.gpa.toFixed(1)} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Teacher Comment & Save Button */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end pt-1">
                <div className="sm:col-span-5">
                  <label className="block text-slate-600 font-bold mb-1">Teacher Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent critical understanding, active class participation, exemplary exam result"
                    value={formData.teacher_comment}
                    onChange={(e) => setFormData({ ...formData, teacher_comment: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Score</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Grouped Scores Filter & Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Filter */}
              <div>
                <label className="text-slate-500 font-semibold mr-1.5">Filter Class:</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
                >
                  <option value="all">🏫 All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="text-slate-500 font-semibold mr-1.5">Filter Subject:</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 max-w-[200px]"
                >
                  <option value="all">📚 All Subjects</option>
                  {allSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class_grade})</option>
                  ))}
                </select>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or subject..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500 w-44 sm:w-56"
                />
              </div>
            </div>

            {/* Group By Class Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg font-bold text-xs">
              <button
                type="button"
                onClick={() => setGroupByClass(true)}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                  groupByClass ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                <span>Group by Class</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupByClass(false)}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                  !groupByClass ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                <span>Flat Table</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DISPLAY MODE 1: SCORES GROUPED BY CLASS                  */}
          {/* ======================================================== */}
          {groupByClass ? (
            <div className="space-y-6">
              {Object.keys(gradesByClass).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  No grade records found matching the active filters.
                </div>
              ) : (
                Object.entries(gradesByClass).map(([className, classGrades]) => {
                  const classAvg = (classGrades.reduce((sum, g) => sum + Number(g.total_score), 0) / classGrades.length).toFixed(1);
                  return (
                    <div key={className} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      {/* Class Section Header */}
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-navy-800 text-white flex items-center justify-center font-bold text-xs">
                            🏫
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">Class: {className}</h4>
                            <p className="text-[11px] text-slate-500">
                              {classGrades.length} recorded subject scores • Class Average: <strong className="text-emerald-700">{classAvg}%</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEntryClass(className);
                              window.scrollTo({ top: 120, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-emerald-600" />
                            <span>Add Score for {className}</span>
                          </button>
                        </div>
                      </div>

                      {/* Class Grades Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-navy-700 text-white font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">Admission No</th>
                              <th className="py-2.5 px-3">Subject</th>
                              <th className="py-2.5 px-2 text-center">Assign (20)</th>
                              <th className="py-2.5 px-2 text-center">Quiz (20)</th>
                              <th className="py-2.5 px-2 text-center">Midterm (20)</th>
                              <th className="py-2.5 px-2 text-center">Exam (40)</th>
                              <th className="py-2.5 px-2 text-center font-bold">Total (100)</th>
                              <th className="py-2.5 px-2 text-center">Grade</th>
                              <th className="py-2.5 px-2 text-center">GPA</th>
                              <th className="py-2.5 px-3 text-center">Report</th>
                              {isAdmin && <th className="py-2.5 px-2 text-center">Admin</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classGrades.map((g, idx) => (
                              <tr key={g.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{g.first_name} {g.last_name}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{g.admission_number}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-700">{g.subject_name}</td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{g.assignment_score}</td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{g.quiz_score}</td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{g.midterm_score}</td>
                                <td className="py-2.5 px-2 text-center text-slate-600">{g.exam_score}</td>
                                <td className="py-2.5 px-2 text-center font-extrabold text-slate-900 bg-slate-100/70">{g.total_score}</td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    g.grade_letter === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                    g.grade_letter === 'B' ? 'bg-blue-100 text-blue-800' :
                                    g.grade_letter === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {g.grade_letter}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono font-bold text-brand-700">{Number(g.gpa_point).toFixed(1)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleViewReportCard(g.student_id)}
                                      className="p-1 text-slate-600 hover:text-brand-600"
                                      title="Generate Student Report Card"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleViewTranscript(g.student_id)}
                                      className="p-1 text-slate-600 hover:text-blue-600"
                                      title="View Student Academic Transcript"
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                {isAdmin && (
                                  <td className="py-2.5 px-2 text-center">
                                    <button
                                      onClick={() => setEditingGrade(g)}
                                      className="p-1 text-slate-400 hover:text-blue-600"
                                      title="Administrator: Edit Grade Entry"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Flat Table Mode */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-700 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-2 text-center">Assign</th>
                      <th className="py-2.5 px-2 text-center">Quiz</th>
                      <th className="py-2.5 px-2 text-center">Midterm</th>
                      <th className="py-2.5 px-2 text-center">Exam</th>
                      <th className="py-2.5 px-2 text-center font-bold">Total</th>
                      <th className="py-2.5 px-2 text-center">Grade</th>
                      <th className="py-2.5 px-2 text-center">GPA</th>
                      <th className="py-2.5 px-3 text-center">Report</th>
                      {isAdmin && <th className="py-2.5 px-2 text-center">Admin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGrades.map((g, idx) => (
                      <tr key={g.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2.5 px-3 font-semibold text-brand-700">{g.class_grade}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{g.first_name} {g.last_name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{g.subject_name}</td>
                        <td className="py-2.5 px-2 text-center text-slate-600">{g.assignment_score}</td>
                        <td className="py-2.5 px-2 text-center text-slate-600">{g.quiz_score}</td>
                        <td className="py-2.5 px-2 text-center text-slate-600">{g.midterm_score}</td>
                        <td className="py-2.5 px-2 text-center text-slate-600">{g.exam_score}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-900 bg-slate-100/70">{g.total_score}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            g.grade_letter === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            g.grade_letter === 'B' ? 'bg-blue-100 text-blue-800' :
                            g.grade_letter === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {g.grade_letter}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-brand-700">{Number(g.gpa_point).toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewReportCard(g.student_id)}
                              className="p-1 text-slate-600 hover:text-brand-600"
                              title="Report Card"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleViewTranscript(g.student_id)}
                              className="p-1 text-slate-600 hover:text-blue-600"
                              title="Transcript"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => setEditingGrade(g)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Edit Grade"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SCHOOL SUBJECTS OFFERED (THE REQUESTED NEW TAB)   */}
      {/* ======================================================== */}
      {viewMode === 'subjects' && !isParent && (
        <div className="space-y-6">
          {/* Header Card for Subjects */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">Curriculum & Subjects Offered in School</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comprehensive directory of all academic subjects taught across Kindergarten, Primary, and Junior High School.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Subject</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-slate-500 font-semibold mr-1.5">Filter Class:</label>
                <select
                  value={subjectFilterClass}
                  onChange={(e) => setSubjectFilterClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
                >
                  <option value="all">🏫 All Classes ({allSubjects.length} subjects)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject title, code or teacher..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500 w-56 sm:w-72"
                />
              </div>
            </div>

            <span className="text-slate-500 font-medium">
              Showing <strong>{filteredSubjects.length}</strong> of {allSubjects.length} subjects
            </span>
          </div>

          {/* Subjects Grouped by Class */}
          <div className="space-y-6">
            {Object.keys(subjectsByClass).length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No subjects found matching your search.
              </div>
            ) : (
              Object.entries(subjectsByClass).map(([className, classSubjects]) => (
                <div key={className} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Class Title Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-navy-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        📚
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{className}</h4>
                        <p className="text-[11px] text-slate-500">{classSubjects.length} subjects offered</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setNewSubjectData({
                          name: '',
                          code: '',
                          class_grade: className,
                          teacher_name: ''
                        });
                        setIsAddSubjectOpen(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>Add Subject for {className}</span>
                    </button>
                  </div>

                  {/* Grid of Subjects in this class */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classSubjects.map(sub => (
                      <div
                        key={sub.id}
                        className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all flex flex-col justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
                              {sub.code}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {sub.class_grade}
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs pt-1 leading-tight">{sub.name}</h5>
                          <p className="text-[11px] text-slate-500">
                            Teacher: <strong className="text-slate-700">{sub.teacher_name || 'Assigned Staff'}</strong>
                          </p>
                        </div>

                        {/* Action Buttons for this subject */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <button
                            onClick={() => handleQuickEnterScore(sub)}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Enter Scores</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingSubject(sub)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Edit Subject"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AUTO CALCULATED RANKINGS & GPA                    */}
      {/* ======================================================== */}
      {viewMode === 'rankings' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Academic Standings & Cumulative GPA Ranking</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated tallying of term averages, 4.0 scale GPA, and official class ranks.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Class:</span>
              <select
                value={selectedClass !== 'all' ? selectedClass : (classes[0]?.name || 'JHS 3')}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-700 text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center">Class Rank</th>
                  <th className="py-2.5 px-3">Admission No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Evaluated Subjects</th>
                  <th className="py-2.5 px-3 text-center">Term Average</th>
                  <th className="py-2.5 px-3 text-center">Cumulative GPA</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankings.map((r, idx) => (
                  <tr key={r.id} className={idx === 0 ? 'bg-amber-50/50' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')}>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        r.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        r.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        r.rank === 3 ? 'bg-amber-800/10 text-amber-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Award className="w-3 h-3" />
                        <span>#{r.rank}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.admission_number}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.first_name} {r.last_name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{r.subjects_count}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">{r.average_score}%</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-brand-700">{r.gpa} / 4.0</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleViewReportCard(r.id)}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold border border-brand-200"
                      >
                        Report Card
                      </button>
                    </td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No student rankings computed yet for this class and term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MULTI-TERM ACADEMIC TRANSCRIPT                   */}
      {/* ======================================================== */}
      {viewMode === 'transcript' && transcriptData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <span className="text-xs uppercase font-bold text-brand-600 tracking-wider">Official Academic Record</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Transcript of {transcriptData.student?.first_name} {transcriptData.student?.last_name} ({transcriptData.student?.admission_number})
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Cumulative GPA</span>
              <span className="text-2xl font-extrabold text-brand-700">{transcriptData.cumulative_gpa} / 4.0</span>
            </div>
          </div>

          <div className="space-y-4">
            {transcriptData.terms?.map((termRec, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <strong className="text-slate-900 text-sm">{termRec.term.term_name} ({termRec.term.session_year})</strong>
                  <div className="flex gap-3 text-slate-600">
                    <span>Average: <strong>{termRec.term_average}%</strong></span>
                    <span>Term GPA: <strong>{termRec.term_gpa}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {termRec.grades.map(g => (
                    <div key={g.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-500 block truncate font-medium">{g.subject_name}</span>
                      <div className="flex justify-between items-baseline mt-1">
                        <strong className="text-slate-900">{g.total_score} pts</strong>
                        <span className="font-bold text-brand-600">{g.grade_letter} ({Number(g.gpa_point).toFixed(1)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setViewMode('input')}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
            >
              Back to Grades
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW SUBJECT OFFERED                          */}
      {/* ======================================================== */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-900">Add New School Subject</h3>
              </div>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. French Language, Ghanaian Language, Coding"
                  value={newSubjectData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const cleanClass = (newSubjectData.class_grade || 'CLS1').replace(/\s+/g, '');
                    const code = `${cleanClass}-${name.substring(0, 3).toUpperCase()}`;
                    setNewSubjectData({ ...newSubjectData, name, code: newSubjectData.code || code });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g. JHS1-FRN, CLS3-MTH"
                  value={newSubjectData.code}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, code: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono uppercase outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Class / Grade *</label>
                <select
                  value={newSubjectData.class_grade}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, class_grade: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-bold text-slate-800"
                  required
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Teacher In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Madame Claudine, Mr. Daniel Boateng"
                  value={newSubjectData.teacher_name}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, teacher_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT SUBJECT                                      */}
      {/* ======================================================== */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Edit Subject: {editingSubject.name}</h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject Name</label>
                <input
                  type="text"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject Code</label>
                <input
                  type="text"
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Class / Grade</label>
                <select
                  value={editingSubject.class_grade}
                  onChange={(e) => setEditingSubject({ ...editingSubject, class_grade: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-bold text-slate-800"
                  required
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Teacher In-Charge</label>
                <input
                  type="text"
                  value={editingSubject.teacher_name || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, teacher_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN EDIT GRADE                                  */}
      {/* ======================================================== */}
      {editingGrade && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Admin Edit Student Grade</h3>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>Student: <strong>{editingGrade.first_name} {editingGrade.last_name}</strong></p>
              <p>Subject: <strong>{editingGrade.subject_name}</strong> ({editingGrade.class_grade})</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Assign (20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editingGrade.assignment_score}
                  onChange={(e) => setEditingGrade({ ...editingGrade, assignment_score: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Quiz (20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editingGrade.quiz_score}
                  onChange={(e) => setEditingGrade({ ...editingGrade, quiz_score: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Midterm (20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editingGrade.midterm_score}
                  onChange={(e) => setEditingGrade({ ...editingGrade, midterm_score: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Exam (40)</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={editingGrade.exam_score}
                  onChange={(e) => setEditingGrade({ ...editingGrade, exam_score: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher Remarks</label>
              <input
                type="text"
                value={editingGrade.teacher_comment || ''}
                onChange={(e) => setEditingGrade({ ...editingGrade, teacher_comment: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingGrade(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminUpdateGrade}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
              >
                Save Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Report Card Modal */}
      <ReportCardModal
        isOpen={isReportCardOpen}
        onClose={() => setIsReportCardOpen(false)}
        reportCard={reportCardData}
      />
    </div>
  );
};
