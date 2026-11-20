import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Award,
  CheckCircle,
  XCircle,
  Plus,
  Play,
  HelpCircle,
  FileCheck,
  Clock,
  Sparkles
} from 'lucide-react';

export const ExamsModule = () => {
  const { role, isAdmin, isParent, user } = useAuth();

  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [subjects, setSubjects] = useState([]);

  // Form State: Create Exam
  const [newExam, setNewExam] = useState({
    title: '',
    subject_id: '',
    class_grade: 'Grade 9A',
    exam_date: '2026-10-02',
    duration_minutes: 45,
    total_marks: 50
  });

  // Form State: Add Question to Bank
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'a',
    points: 10
  });

  // Interactive Exam Taker State: { [question_id]: 'a' | 'b' }
  const [studentAnswers, setStudentAnswers] = useState({});
  const [gradedResult, setGradedResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadExams();
    loadSubjects();
  }, [role]);

  const loadExams = async () => {
    try {
      const res = await apiClient.get('/exams', { term_id: 1 });
      const exList = res.data || [];
      setExams(exList);
      if (exList.length > 0) {
        loadExamDetails(exList[0].id);
      }
    } catch (e) {
      console.warn('Exams load error:', e);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await apiClient.get('/grades/subjects');
      const subs = res.data || [];
      setSubjects(subs);
      if (subs.length > 0 && !newExam.subject_id) {
        setNewExam(prev => ({ ...prev, subject_id: String(subs[0].id) }));
      }
    } catch (e) {
      console.warn('Subjects error:', e);
    }
  };

  const loadExamDetails = async (examId) => {
    try {
      const res = await apiClient.get(`/exams/${examId}`);
      setSelectedExam(res.data);
      setGradedResult(null);

      // If previous submission exists, pre-fill
      if (res.data?.submission) {
        setStudentAnswers(res.data.submission.answers || {});
      } else {
        setStudentAnswers({});
      }
    } catch (e) {
      console.warn('Exam details error:', e);
    }
  };

  // Create Exam (Staff or Admin)
  const handleCreateExam = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const res = await apiClient.post('/exams', {
        ...newExam,
        subject_id: Number(newExam.subject_id),
        term_id: 1,
        week_id: 5
      });
      setStatusMsg('Exam scheduled successfully.');
      setNewExam({ title: '', subject_id: String(subjects[0]?.id || ''), class_grade: 'Grade 9A', exam_date: '2026-10-02', duration_minutes: 45, total_marks: 50 });
      loadExams();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  // Add Question to Bank
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    setStatusMsg('');
    try {
      await apiClient.post(`/exams/${selectedExam.id}/questions`, newQuestion);
      setStatusMsg('Objective question added to exam question bank.');
      setNewQuestion({ question_text: '', question_type: 'multiple_choice', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', points: 10 });
      loadExamDetails(selectedExam.id);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Question Error: ${err.message}`);
    }
  };

  // Submit and Auto-Grade Exam
  const handleAutoGradeSubmit = async () => {
    if (!selectedExam) return;
    try {
      const targetStudentId = isParent ? user?.child_student_id : 1;
      const res = await apiClient.post(`/exams/${selectedExam.id}/submit`, {
        student_id: targetStudentId,
        answers: studentAnswers
      });
      setGradedResult(res.data);
    } catch (err) {
      alert(`Auto-Grading Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 8: Exam Builder & Auto-Grading</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Objective question banks (Multiple Choice & True/False) • Exam scheduling • Instant automated grading.
          </p>
        </div>

        {/* Selected Exam Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Active Exam:</span>
          <select
            value={selectedExam?.id || ''}
            onChange={(e) => loadExamDetails(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
          >
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.title} ({ex.class_grade})</option>
            ))}
          </select>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          statusMsg.includes('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Auto-Graded Results Alert Banner */}
      {gradedResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-navy-900 text-white shadow-lg border border-emerald-800 space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="font-extrabold text-base">Instant Auto-Grading Completed!</h3>
                <p className="text-xs text-slate-300">Submitted and evaluated in real-time by the objective scoring engine.</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-bold text-emerald-400 block">Overall Score</span>
              <span className="text-3xl font-black">{gradedResult.score} / {gradedResult.total_possible} pts ({gradedResult.percentage}%)</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Exam Creation & Question Builder (Staff/Admin Only) */}
        {!isParent && (
          <div className="lg:col-span-1 space-y-6">
            {/* Create Exam Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-600" />
                <span>Schedule New Exam</span>
              </h3>

              <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Exam Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics Midterm Quiz"
                    value={newExam.title}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-bold text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Subject</label>
                    <select
                      value={newExam.subject_id}
                      onChange={(e) => setNewExam({ ...newExam, subject_id: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Class</label>
                    <select
                      value={newExam.class_grade}
                      onChange={(e) => setNewExam({ ...newExam, class_grade: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="Grade 9A">Grade 9A</option>
                      <option value="Grade 9B">Grade 9B</option>
                      <option value="Grade 10A">Grade 10A</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Exam Date</label>
                    <input
                      type="date"
                      value={newExam.exam_date}
                      onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      value={newExam.duration_minutes}
                      onChange={(e) => setNewExam({ ...newExam, duration_minutes: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Create Exam Schedule
                </button>
              </form>
            </div>

            {/* Add Question to Question Bank Card */}
            {selectedExam && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Add Question to Question Bank</span>
                </h3>

                <form onSubmit={handleAddQuestion} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Question Type</label>
                    <select
                      value={newQuestion.question_type}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="multiple_choice">Multiple Choice (4 Options)</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Question Prompt</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. What is the value of 5x when x = 8?"
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                      required
                    />
                  </div>

                  {newQuestion.question_type === 'multiple_choice' ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Option A"
                        value={newQuestion.option_a}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Option B"
                        value={newQuestion.option_b}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Option C"
                        value={newQuestion.option_c}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_c: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Option D"
                        value={newQuestion.option_d}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_d: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs"
                      />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Correct Answer</label>
                      <select
                        value={newQuestion.correct_answer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs font-bold uppercase"
                      >
                        <option value="a">A {newQuestion.question_type === 'true_false' ? '(True)' : ''}</option>
                        <option value="b">B {newQuestion.question_type === 'true_false' ? '(False)' : ''}</option>
                        {newQuestion.question_type === 'multiple_choice' && (
                          <>
                            <option value="c">C</option>
                            <option value="d">D</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Points</label>
                      <input
                        type="number"
                        value={newQuestion.points}
                        onChange={(e) => setNewQuestion({ ...newQuestion, points: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                  >
                    Add Question to Bank
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Right Column: Interactive Objective Exam Paper & Auto Grading Test */}
        <div className={`${!isParent ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {selectedExam ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Exam Header */}
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                    {selectedExam.subject_name} • {selectedExam.class_grade}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedExam.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedExam.duration_minutes} Minutes</span>
                    <span>•</span>
                    <span>Date: {selectedExam.exam_date}</span>
                    <span>•</span>
                    <span>Total Marks: {selectedExam.total_marks}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoGradeSubmit}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-900/20 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Submit & Auto-Grade Now</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-5">
                {selectedExam.questions?.map((q, idx) => {
                  const selectedOpt = studentAnswers[q.id] || studentAnswers[q.question_number];
                  const itemized = gradedResult?.itemized_results?.find(ir => ir.question_id === q.id || ir.question_number === q.question_number);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border text-xs space-y-3 transition-colors ${
                        itemized 
                          ? (itemized.is_correct ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200')
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <strong className="text-sm font-semibold text-slate-900">
                          {idx + 1}. {q.question_text}
                        </strong>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">[{q.points} Pts]</span>
                          {itemized && (
                            itemized.is_correct ? (
                              <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                <CheckCircle className="w-3.5 h-3.5" /> Correct
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                                <XCircle className="w-3.5 h-3.5" /> Incorrect (Key: {itemized.correct_answer.toUpperCase()})
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {[
                          { key: 'a', label: q.option_a || 'True' },
                          { key: 'b', label: q.option_b || 'False' },
                          ...(q.option_c ? [{ key: 'c', label: q.option_c }] : []),
                          ...(q.option_d ? [{ key: 'd', label: q.option_d }] : [])
                        ].map(opt => {
                          const isChosen = selectedOpt === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setStudentAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left font-medium transition-all ${
                                isChosen
                                  ? 'bg-brand-600 text-white border-brand-700 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] uppercase ${
                                isChosen ? 'bg-white text-brand-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {opt.key}
                              </span>
                              <span className="text-xs">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Select or create an exam to view question bank and auto-grader.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
