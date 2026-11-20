import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  BookOpen,
  Plus,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Search,
  BookMarked,
  Clock,
  DollarSign,
  Edit2
} from 'lucide-react';

export const LibraryModule = () => {
  const { role, isAdmin, isParent, user } = useAuth();

  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [students, setStudents] = useState([]);

  // Active view: 'catalog' | 'loans'
  const [viewMode, setViewMode] = useState('catalog');

  // Issue Book Form
  const [issueData, setIssueData] = useState({
    book_id: '',
    student_id: '',
    due_days: '14'
  });

  // Admin Add Book Form
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Mathematics',
    total_copies: '5',
    location_shelf: 'A1-01',
    fine_rate_per_day: '1.0'
  });

  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadLibraryData();
  }, [role]);

  const loadLibraryData = async () => {
    try {
      const [bRes, lRes, sRes] = await Promise.all([
        apiClient.get('/library/books'),
        apiClient.get('/library/loans', isParent && user?.child_student_id ? { student_id: user.child_student_id } : {}),
        apiClient.get('/students')
      ]);

      const bookList = bRes.data || [];
      const stdList = sRes.data || [];

      setBooks(bookList);
      setLoans(lRes.data || []);
      setStudents(stdList);

      if (bookList.length > 0 && !issueData.book_id) {
        setIssueData(prev => ({ ...prev, book_id: String(bookList[0].id) }));
      }
      if (stdList.length > 0 && !issueData.student_id) {
        setIssueData(prev => ({ ...prev, student_id: String(stdList[0].id) }));
      }
    } catch (e) {
      console.warn('Library load error:', e);
    }
  };

  // Issue Book
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const res = await apiClient.post('/library/loans/issue', {
        book_id: Number(issueData.book_id),
        student_id: Number(issueData.student_id),
        due_days: Number(issueData.due_days)
      });
      setStatusMsg(res.data.message || 'Book issued successfully.');
      loadLibraryData();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Issue Error: ${err.message}`);
    }
  };

  // Return Book with fine calculation
  const handleReturnBook = async (loanId) => {
    try {
      const res = await apiClient.post('/library/loans/return', { loan_id: loanId });
      alert(`${res.data.message} ${res.data.overdue_fine > 0 ? `Overdue Fine: $${res.data.overdue_fine}` : 'No overdue fines.'}`);
      loadLibraryData();
    } catch (err) {
      alert(`Return Error: ${err.message}`);
    }
  };

  // Admin Add Book to Stock
  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatusMsg('');
    try {
      const res = await apiClient.post('/library/books', newBook);
      setStatusMsg(res.data.message || 'Book added to catalog.');
      setNewBook({ isbn: '', title: '', author: '', category: 'Mathematics', total_copies: '5', location_shelf: 'A1-01', fine_rate_per_day: '1.0' });
      loadLibraryData();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Stock Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 7: Library Management & Stock</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Book cataloging • Issue & return tracking • Overdue fine calculation • Admin stock management.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setViewMode('catalog')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'catalog' ? 'bg-navy-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Book Catalog
          </button>
          <button
            onClick={() => setViewMode('loans')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'loans' ? 'bg-navy-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Loan Records & Fines ({loans.length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          statusMsg.includes('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* CATALOG VIEW */}
      {viewMode === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin Add Book to Stock Form */}
          {isAdmin && (
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-600" />
                <span>Admin: Add Book to Stock</span>
              </h3>

              <form onSubmit={handleAddBook} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">ISBN</label>
                  <input
                    type="text"
                    placeholder="978-..."
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Book Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Cambridge IGCSE Physics"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    placeholder="e.g. David Sang"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Category</label>
                    <select
                      value={newBook.category}
                      onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="Literature">Literature</option>
                      <option value="Technology">Technology</option>
                      <option value="History">History</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Total Copies</label>
                    <input
                      type="number"
                      min="1"
                      value={newBook.total_copies}
                      onChange={(e) => setNewBook({ ...newBook, total_copies: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Shelf Location</label>
                    <input
                      type="text"
                      placeholder="e.g. B2-11"
                      value={newBook.location_shelf}
                      onChange={(e) => setNewBook({ ...newBook, location_shelf: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Fine/Day ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newBook.fine_rate_per_day}
                      onChange={(e) => setNewBook({ ...newBook, fine_rate_per_day: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register into Stock</span>
                </button>
              </form>
            </div>
          )}

          {/* Book Catalog Table */}
          <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            {/* Issue Book Bar (Staff / Admin) */}
            {!isParent && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                  Quick Issue Book to Student
                </span>
                <form onSubmit={handleIssueBook} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <select
                      value={issueData.book_id}
                      onChange={(e) => setIssueData({ ...issueData, book_id: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      {books.map(b => (
                        <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                          {b.title} ({b.available_copies} avail)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={issueData.student_id}
                      onChange={(e) => setIssueData({ ...issueData, student_id: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={issueData.due_days}
                      onChange={(e) => setIssueData({ ...issueData, due_days: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="7">7 Days Loan</option>
                      <option value="14">14 Days Loan</option>
                      <option value="21">21 Days Loan</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs shadow"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Issue Loan</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Catalog Grid */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Catalog of Library Books</span>
                <span className="text-slate-500">{books.length} titles in system</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-700 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Title & ISBN</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-2 text-center">Shelf</th>
                      <th className="py-2.5 px-2 text-center">Available / Total</th>
                      <th className="py-2.5 px-2 text-center">Fine / Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {books.map((b, idx) => (
                      <tr key={b.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block font-bold">{b.title}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{b.isbn}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{b.author}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {b.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600">{b.location_shelf || '-'}</td>
                        <td className="py-2.5 px-2 text-center font-bold">
                          <span className={b.available_copies > 0 ? 'text-emerald-700' : 'text-rose-600 font-extrabold'}>
                            {b.available_copies}
                          </span>
                          <span className="text-slate-400"> / {b.total_copies}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">${b.fine_rate_per_day}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOANS VIEW */}
      {viewMode === 'loans' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-700">Book Loan Ledger & Return Tracking</span>
            <span className="text-slate-500">{loans.length} active or historical loans</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-700 text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Borrower Student</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Fines Assessed</th>
                  {!isParent && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loans.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{l.book_title}</td>
                    <td className="py-2.5 px-3 text-slate-700">{l.first_name} {l.last_name} ({l.class_grade})</td>
                    <td className="py-2.5 px-3 text-slate-600">{l.issue_date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{l.due_date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'returned' ? 'bg-slate-100 text-slate-700' :
                        l.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">
                      {l.fine_amount > 0 ? `$${Number(l.fine_amount).toFixed(2)}` : '$0.00'}
                    </td>
                    {!isParent && (
                      <td className="py-2.5 px-3 text-center">
                        {l.status !== 'returned' ? (
                          <button
                            onClick={() => handleReturnBook(l.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Mark Returned</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Returned on {l.return_date}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">No loan records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
