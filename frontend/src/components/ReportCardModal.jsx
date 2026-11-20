import React, { useRef } from 'react';
import { X, Printer, Award, FileText, CheckCircle2 } from 'lucide-react';

export const ReportCardModal = ({ isOpen, onClose, reportCard }) => {
  const printRef = useRef(null);

  if (!isOpen || !reportCard) return null;

  const { student, grades = [], summary = {}, school_name, academic_session, term_name, headmaster_remark } = reportCard;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="bg-navy-800 text-white px-5 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm sm:text-base">Official Student Report Card</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Card Document Content (Letterhead Style) */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 text-slate-800 bg-white">
          {/* Letterhead */}
          <div className="border-b-2 border-navy-700 pb-4 text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-800 tracking-tight uppercase">
              {school_name || 'Greenwood International Academy'}
            </h1>
            <p className="text-xs text-slate-600 font-medium tracking-wide">
              Excellence, Integrity & Academic Distinction • P.O. Box 4892, High Street
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-brand-700 pt-1">
              <span>Academic Session: {academic_session || '2026/2027'}</span>
              <span>•</span>
              <span>Period: {term_name || 'Term 1'}</span>
            </div>
          </div>

          {/* Student Profile Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block font-medium">Student Name:</span>
              <strong className="text-slate-900 text-sm">{student?.first_name} {student?.last_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Admission No:</span>
              <strong className="text-slate-900 text-sm font-mono">{student?.admission_number}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Class / Grade:</span>
              <strong className="text-slate-900 text-sm">{student?.class_grade}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Class Rank:</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs">
                <Award className="w-3.5 h-3.5" />
                {summary.class_rank || 'N/A'}
              </span>
            </div>
          </div>

          {/* Academic Performance Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Subject Assessment Breakdown</span>
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-700 text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-2 text-center">Assign (20)</th>
                    <th className="py-2.5 px-2 text-center">Quiz (20)</th>
                    <th className="py-2.5 px-2 text-center">Midterm (20)</th>
                    <th className="py-2.5 px-2 text-center">Exam (40)</th>
                    <th className="py-2.5 px-2 text-center font-bold">Total (100)</th>
                    <th className="py-2.5 px-2 text-center">Grade</th>
                    <th className="py-2.5 px-2 text-center">GPA</th>
                    <th className="py-2.5 px-3">Teacher Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {grades.map((g, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{g.subject_name}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{g.assignment_score}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{g.quiz_score}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{g.midterm_score}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{g.exam_score}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900 bg-slate-100/60">
                        {g.total_score}
                      </td>
                      <td className="py-2 px-2 text-center font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          g.grade_letter === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          g.grade_letter === 'B' ? 'bg-blue-100 text-blue-800' :
                          g.grade_letter === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {g.grade_letter}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-medium text-slate-700">{Number(g.gpa_point).toFixed(1)}</td>
                      <td className="py-2 px-3 text-slate-600 italic text-[11px]">{g.teacher_comment || '-'}</td>
                    </tr>
                  ))}
                  {grades.length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-4 text-center text-slate-400">No grades recorded for this term.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic & Attendance Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Academic Highlights */}
            <div className="bg-brand-50/60 border border-brand-200 rounded-xl p-4 text-xs space-y-2">
              <h5 className="font-bold text-brand-900 uppercase tracking-wide">Academic Summary</h5>
              <div className="flex justify-between py-1 border-b border-brand-100">
                <span className="text-slate-600">Total Subjects Evaluated:</span>
                <strong className="text-slate-900">{summary.total_subjects}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-brand-100">
                <span className="text-slate-600">Overall Term Average:</span>
                <strong className="text-brand-800 text-sm">{summary.term_average}%</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-brand-100">
                <span className="text-slate-600">Term GPA (4.0 Scale):</span>
                <strong className="text-brand-800 text-sm font-mono">{summary.term_gpa} / 4.0</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Official Class Rank:</span>
                <strong className="text-amber-800">{summary.class_rank}</strong>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <h5 className="font-bold text-slate-700 uppercase tracking-wide">Attendance Summary</h5>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Total School Days:</span>
                <strong className="text-slate-900">{summary.attendance?.total_days || 0}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Days Present / Attended:</span>
                <strong className="text-emerald-700">{summary.attendance?.present_days || 0}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Days Absent:</span>
                <strong className="text-rose-600">{summary.attendance?.absent_days || 0}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Times Late:</span>
                <strong className="text-amber-600">{summary.attendance?.late_days || 0}</strong>
              </div>
            </div>
          </div>

          {/* Remarks & Signatures */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Headmaster's Evaluation:</span>
              <p className="text-xs italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                "{headmaster_remark || 'Satisfactory academic progress. Recommended for continuous progression.'}"
              </p>
            </div>

            <div className="flex justify-between items-end pt-6 text-xs text-slate-600">
              <div className="text-center">
                <div className="w-36 border-b border-slate-400 mb-1"></div>
                <span>Class Teacher Signature</span>
              </div>
              <div className="text-center">
                <div className="w-24 h-12 border border-slate-300 rounded mb-1 flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  School Seal
                </div>
                <span>Official Stamp</span>
              </div>
              <div className="text-center">
                <div className="w-36 border-b border-slate-400 mb-1"></div>
                <span>Principal / Head of School</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
