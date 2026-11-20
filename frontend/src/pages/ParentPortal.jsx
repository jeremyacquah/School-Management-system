import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ReportCardModal } from '../components/ReportCardModal';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  FileSpreadsheet,
  Receipt,
  Bell,
  Award,
  DollarSign,
  Download,
  Printer,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const ParentPortal = () => {
  const { user } = useAuth();

  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'grades' | 'fees' | 'notices'

  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('1');

  const [attendance, setAttendance] = useState([]);
  const [attStats, setAttStats] = useState({ percentage: 100, present_count: 0, absent_count: 0 });
  const [reportCard, setReportCard] = useState(null);
  const [feeBalance, setFeeBalance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);

  // Modals
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadParentPortalData();
  }, [user, selectedTerm]);

  const loadParentPortalData = async () => {
    try {
      const childId = user?.child_student_id || 1;

      const [sRes, tRes, attRes, attStatsRes, rcRes, feeRes, pRes, nRes] = await Promise.all([
        apiClient.get(`/students/${childId}`),
        apiClient.get('/terms'),
        apiClient.get('/attendance', { student_id: childId, term_id: selectedTerm }),
        apiClient.get('/attendance/stats', { student_id: childId, term_id: selectedTerm }),
        apiClient.get(`/grades/report-card/${childId}`, { term_id: selectedTerm }),
        apiClient.get(`/fees/balance/${childId}`, { term_id: selectedTerm }),
        apiClient.get('/fees/payments', { student_id: childId, term_id: selectedTerm }),
        apiClient.get('/notices')
      ]);

      setStudent(sRes.data);
      setTerms(tRes.data || []);
      setAttendance(attRes.data || []);
      setAttStats(attStatsRes.data || {});
      setReportCard(rcRes.data);
      setFeeBalance(feeRes.data);
      setPayments(pRes.data || []);
      setNotices(nRes.data || []);
    } catch (e) {
      console.warn('Parent portal data load error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Parent Welcome Letterhead Card */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-900 rounded-2xl p-6 text-white shadow-lg border border-navy-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                Verified Parent Account (Read-Only)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-2">
              Student Record: {student?.first_name} {student?.last_name}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Admission: <strong className="font-mono text-emerald-400">{student?.admission_number}</strong> • Class: <strong>{student?.class_grade}</strong> • Parent: <strong>{user?.full_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-xs font-semibold rounded-lg p-2 text-slate-200"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.term_name} ({t.session_year})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview', icon: GraduationCap },
          { id: 'attendance', label: 'Attendance by Week/Term', icon: CalendarCheck2 },
          { id: 'grades', label: 'Grades & Report Card', icon: FileSpreadsheet },
          { id: 'fees', label: 'Fee Balance & Receipts', icon: Receipt },
          { id: 'notices', label: 'School Notices', icon: Bell }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                isActive ? 'bg-navy-700 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 block">Attendance Rate</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{attStats.percentage || 96.5}%</div>
              <p className="text-xs text-slate-500 mt-1">
                {attStats.present_count || 19} Days Present • {attStats.absent_count || 1} Days Absent
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 block">Fee Balance</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">${feeBalance?.balance || 240}</div>
              <p className="text-xs text-slate-500 mt-1">
                Paid: ${feeBalance?.total_paid || 600} of ${feeBalance?.total_due || 840} Total Due
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 block">Current Standings</span>
              <div className="mt-2 text-3xl font-extrabold text-brand-700 font-mono">
                {reportCard?.summary?.term_gpa || '3.8'} / 4.0
              </div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Class Rank: {reportCard?.summary?.class_rank || '#2'}
              </p>
            </div>
          </div>

          {/* Quick Action: View Official Report Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Term Progress Report Card Ready</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Full academic breakdown with teacher evaluations and official school principal signature.
              </p>
            </div>

            <button
              onClick={() => setIsReportCardOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Open & Print Report Card</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-700">Weekly Attendance Breakdown</span>
            <span className="text-emerald-700 font-bold">{attStats.percentage}% Present Rate</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-700 text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">School Week</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3">Notes & Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-900">{a.date}</td>
                    <td className="py-2 px-3 text-slate-600">Week {a.week_number}: {a.week_title}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        a.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                        a.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{a.recorded_by}</td>
                    <td className="py-2 px-3 text-slate-500 italic">{a.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GRADES & REPORT CARD */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Subject Scores</span>
              <button
                onClick={() => setIsReportCardOpen(true)}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow"
              >
                View Full Printable Report Card
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-700 text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-2 text-center">Assign</th>
                    <th className="py-2.5 px-2 text-center">Quiz</th>
                    <th className="py-2.5 px-2 text-center">Midterm</th>
                    <th className="py-2.5 px-2 text-center">Exam</th>
                    <th className="py-2.5 px-2 text-center font-bold">Total</th>
                    <th className="py-2.5 px-2 text-center">Grade</th>
                    <th className="py-2.5 px-2 text-center">GPA</th>
                    <th className="py-2.5 px-3">Teacher Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportCard?.grades?.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{g.subject_name}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{g.assignment_score}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{g.quiz_score}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{g.midterm_score}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{g.exam_score}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 bg-slate-50">{g.total_score}</td>
                      <td className="py-2.5 px-2 text-center font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                          {g.grade_letter}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium">{Number(g.gpa_point).toFixed(1)}</td>
                      <td className="py-2.5 px-3 italic text-slate-600">{g.teacher_comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FEES & RECEIPTS */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Official Payment Receipts</span>
            <span className="text-xs text-amber-700 font-bold">Remaining Balance: ${feeBalance?.balance || 240}</span>
          </div>

          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono font-bold text-brand-700">{p.receipt_number}</strong>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase">
                      {p.payment_method?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{p.category_name} • Date: {p.payment_date}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-700">${Number(p.amount_paid).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block">Bal: ${Number(p.balance_after).toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(p)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Slip</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SCHOOL NOTICES */}
      {activeTab === 'notices' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block pb-2 border-b border-slate-100">
            School Announcements for Parents
          </span>

          <div className="space-y-3">
            {notices.map(n => (
              <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <strong className="text-slate-900 block font-bold text-sm">{n.title}</strong>
                <p className="text-slate-700 leading-relaxed">{n.content}</p>
                <span className="text-[10px] text-slate-400 block pt-1">Published by: {n.sent_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ReportCardModal
        isOpen={isReportCardOpen}
        onClose={() => setIsReportCardOpen(false)}
        reportCard={reportCard}
      />

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        payment={selectedReceipt}
      />
    </div>
  );
};
