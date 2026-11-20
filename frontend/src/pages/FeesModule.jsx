import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ReceiptModal } from '../components/ReceiptModal';
import { SMSWhatsAppModal } from '../components/SMSWhatsAppModal';
import {
  DollarSign,
  Receipt,
  Plus,
  Send,
  Share2,
  Copy,
  Printer,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  Landmark,
  Coins,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export const FeesModule = () => {
  const { role, isAdmin, isUser, isParent, user } = useAuth();

  const [terms, setTerms] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentBalance, setStudentBalance] = useState(null);

  // Record Payment Form State
  const [formData, setFormData] = useState({
    category_name: 'School Tuition Fee',
    amount_paid: '200',
    payment_method: 'mobile_money',
    reference_code: 'MOMO-88192',
    notes: 'Partial payment'
  });

  // Admin Fee Structure Edit State
  const [newFeeCategory, setNewFeeCategory] = useState({ name: '', amount: '', description: '' });
  const [editingFeeStructure, setEditingFeeStructure] = useState(null);

  // Modals
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [smsModalData, setSmsModalData] = useState(null);

  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadFeeStructures();
    loadPayments();
  }, [selectedTerm, role]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentBalance(selectedStudentId);
    }
  }, [selectedStudentId, selectedTerm]);

  const loadMetadata = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        apiClient.get('/terms'),
        apiClient.get('/students')
      ]);
      setTerms(tRes.data || []);
      const stdList = sRes.data || [];
      setStudents(stdList);

      if (tRes.data?.length > 0) setSelectedTerm(String(tRes.data[0].id));
      if (stdList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(String(stdList[0].id));
      }
    } catch (e) {
      console.warn('Metadata load error:', e);
    }
  };

  const loadFeeStructures = async () => {
    try {
      const res = await apiClient.get('/fees/structures', { term_id: selectedTerm });
      setFeeStructures(res.data || []);
    } catch (e) {
      console.warn('Fee structures error:', e);
    }
  };

  const loadPayments = async () => {
    try {
      const params = { term_id: selectedTerm };
      if (isParent && user?.child_student_id) {
        params.student_id = user.child_student_id;
      }
      const res = await apiClient.get('/fees/payments', params);
      setPayments(res.data || []);
    } catch (e) {
      console.warn('Payments load error:', e);
    }
  };

  const loadStudentBalance = async (sId) => {
    try {
      const res = await apiClient.get(`/fees/balance/${sId}`, { term_id: selectedTerm });
      setStudentBalance(res.data);
    } catch (e) {
      console.warn('Balance load error:', e);
    }
  };

  // Submit Payment (User or Admin)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const res = await apiClient.post('/fees/payments', {
        student_id: Number(selectedStudentId),
        term_id: Number(selectedTerm),
        category_name: formData.category_name,
        amount_paid: Number(formData.amount_paid),
        payment_method: formData.payment_method,
        reference_code: formData.reference_code,
        notes: formData.notes
      }, { module: 'payments' });

      setStatusMsg(res.data.message || 'Payment recorded successfully!');

      // Open short receipt slip immediately
      const studentObj = students.find(s => s.id === Number(selectedStudentId));
      const paymentObj = {
        receipt_number: res.data.receipt_number,
        first_name: studentObj?.first_name || '',
        last_name: studentObj?.last_name || '',
        admission_number: studentObj?.admission_number || '',
        class_grade: studentObj?.class_grade || '',
        amount_paid: res.data.amount_paid,
        balance_after: res.data.balance_left,
        category_name: formData.category_name,
        payment_method: formData.payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        reference_code: formData.reference_code,
        receipt_text: res.data.receipt_text
      };

      setSelectedReceiptPayment(paymentObj);
      setIsReceiptModalOpen(true);

      loadPayments();
      loadStudentBalance(selectedStudentId);
    } catch (err) {
      setStatusMsg(`Payment Error: ${err.message}`);
    }
  };

  // Admin: Update Fee Structure Amount (Admin Only!)
  const handleUpdateFeeAmount = async () => {
    if (!editingFeeStructure || !isAdmin) return;
    try {
      await apiClient.put(`/fees/structures/${editingFeeStructure.id}`, {
        amount: Number(editingFeeStructure.amount),
        description: editingFeeStructure.description
      });
      setEditingFeeStructure(null);
      setStatusMsg('Fee amount updated by administrator.');
      loadFeeStructures();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Admin Update Failed: ${err.message}`);
    }
  };

  // Admin: Create New Fee Category (Admin Only!)
  const handleAddFeeCategory = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await apiClient.post('/fees/structures', {
        term_id: Number(selectedTerm),
        category_name: newFeeCategory.name,
        amount: Number(newFeeCategory.amount),
        description: newFeeCategory.description
      });
      setNewFeeCategory({ name: '', amount: '', description: '' });
      setStatusMsg('Fee structure item created.');
      loadFeeStructures();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Admin Create Failed: ${err.message}`);
    }
  };

  // Admin: Resend Receipt
  const handleResendReceipt = async (payment) => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.post(`/fees/receipts/${payment.receipt_number}/resend`, {});
      setStatusMsg(res.data.message || 'Receipt resent.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Resend Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 3 & 4: Fees, Payments & Short Receipts</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track dues, partial payments (Cash, Bank, Mobile Money) & auto-generate short receipts for SMS/WhatsApp.
          </p>
        </div>

        {/* Term Switcher */}
        <div>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.term_name} ({t.session_year})</option>
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

      {/* PARENT VIEW: Fee Balance & Payment History */}
      {isParent ? (
        <div className="space-y-6">
          {/* Child Fee Balance Card */}
          <div className="bg-gradient-to-br from-navy-800 to-navy-900 text-white rounded-2xl p-6 shadow-md border border-navy-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Parent Portal: Fee Overview</span>
                <h3 className="text-xl font-bold mt-1">
                  {studentBalance?.student_name || 'Enrolled Student'} {studentBalance?.admission_number ? `(${studentBalance.admission_number})` : ''}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Class: <strong>{studentBalance?.class_grade || 'Class'}</strong> • Greenwood Academy
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">Outstanding Fee Balance</span>
                <span className="text-3xl font-extrabold text-white">
                  ${studentBalance?.balance !== undefined ? Number(studentBalance.balance).toFixed(2) : '0.00'}
                </span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  (studentBalance?.balance || 0) <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {studentBalance?.status || 'Term 1 Status'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-navy-700/80 text-xs">
              <div>
                <span className="text-slate-400 block">Total Due:</span>
                <strong className="text-sm font-bold">${studentBalance?.total_due !== undefined ? Number(studentBalance.total_due).toFixed(2) : '0.00'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Total Paid:</span>
                <strong className="text-sm font-bold text-emerald-400">${studentBalance?.total_paid !== undefined ? Number(studentBalance.total_paid).toFixed(2) : '0.00'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Status:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                  (studentBalance?.balance || 0) <= 0
                    ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-900/80 text-amber-300 border border-amber-700'
                }`}>
                  {studentBalance?.status || 'Partial Payment'}
                </span>
              </div>
            </div>
          </div>

          {/* Child Receipts List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider block">Payment Receipts</span>
                <span className="text-[11px] text-slate-500">Official verified receipts for payments made to school accounts</span>
              </div>
              <span className="text-slate-600 bg-slate-200/60 font-semibold px-2 py-0.5 rounded-full">{payments.length} receipts</span>
            </div>

            <div className="divide-y divide-slate-100">
              {payments.map(p => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900">{p.receipt_number}</strong>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded uppercase">
                        {p.payment_method?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{p.category_name} • Date: {p.payment_date}</p>
                    <p className="text-xs text-slate-400">Balance left after: ${Number(p.balance_after).toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-700">${Number(p.amount_paid).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedReceiptPayment(p);
                        setIsReceiptModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs italic">
                  No payment receipts recorded yet for this term. Whenever you make a fee payment, official receipts will be issued here.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STAFF & ADMIN VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Record Payment Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-600" />
                <span>Record Fee Payment</span>
              </h3>

              <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Select Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                    required
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>
                    ))}
                  </select>
                </div>

                {/* Live Student Fee Balance Widget */}
                {studentBalance && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Term Due:</span>
                      <strong className="text-slate-800">${studentBalance.total_due}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Previously Paid:</span>
                      <strong className="text-emerald-700">${studentBalance.total_paid}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-700">Remaining Balance:</span>
                      <span className="text-amber-700 text-sm">${studentBalance.balance}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Fee Category</label>
                  <select
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                  >
                    {feeStructures.map(fs => (
                      <option key={fs.id} value={fs.category_name}>{fs.category_name} (${fs.amount})</option>
                    ))}
                    <option value="Library Fine">Library Overdue Fine</option>
                    <option value="Uniform / Sports Fee">Uniform / Sports Fee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Amount to Pay ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-900 text-sm"
                    placeholder="e.g. 200"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Supports full or partial payment amounts.</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                  >
                    <option value="cash">Cash (Accounts Counter)</option>
                    <option value="mobile_money">Mobile Money (M-Pesa / MoMo / Airtel)</option>
                    <option value="bank_transfer">Bank Wire Transfer</option>
                    <option value="card">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Reference / Transaction ID</label>
                  <input
                    type="text"
                    value={formData.reference_code}
                    onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono text-xs"
                    placeholder="e.g. MOMO-98124 or CSH-001"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Record Payment & Issue Receipt</span>
                </button>
              </form>
            </div>

            {/* Fee Structures Box (Only Admin can change fee amounts) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Fee Schedule ({terms.find(t => t.id === Number(selectedTerm))?.term_name})
                </span>
                {isAdmin ? (
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                    Admin Config
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded">
                    Read-Only
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {feeStructures.map(fs => (
                  <div key={fs.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <strong className="text-slate-800 block">{fs.category_name}</strong>
                      <span className="text-[10px] text-slate-500">{fs.description || 'Standard term fee'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">${fs.amount}</span>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingFeeStructure(fs)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                          title="Admin: Change fee amount"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">Add New Fee Item:</span>
                  <form onSubmit={handleAddFeeCategory} className="flex gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Fee Name"
                      value={newFeeCategory.name}
                      onChange={(e) => setNewFeeCategory({ ...newFeeCategory, name: e.target.value })}
                      className="flex-1 border border-slate-200 rounded p-1.5 text-xs"
                      required
                    />
                    <input
                      type="number"
                      placeholder="$"
                      value={newFeeCategory.amount}
                      onChange={(e) => setNewFeeCategory({ ...newFeeCategory, amount: e.target.value })}
                      className="w-16 border border-slate-200 rounded p-1.5 text-xs"
                      required
                    />
                    <button type="submit" className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-bold">
                      Add
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Payments & Short Receipts Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Receipts & Payment Transactions</span>
                <span className="text-slate-500">{payments.length} transactions recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-700 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3 text-center">Receipt & SMS</th>
                      {isAdmin && <th className="py-2.5 px-2 text-center">Admin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {payments.map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-700">{p.receipt_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.first_name} {p.last_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.category_name}</td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-700">${Number(p.amount_paid).toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                            {p.payment_method?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">${Number(p.balance_after).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedReceiptPayment(p);
                                setIsReceiptModalOpen(true);
                              }}
                              className="p-1 text-slate-600 hover:text-brand-600"
                              title="View Short Printable Slip"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setSmsModalData({
                                  title: `Receipt ${p.receipt_number} SMS Template`,
                                  text: p.receipt_text,
                                  recipientName: `${p.first_name} ${p.last_name}`,
                                  recipientPhone: p.parent_phone
                                });
                              }}
                              className="p-1 text-slate-600 hover:text-emerald-600"
                              title="Copy SMS / WhatsApp Short Template"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => handleResendReceipt(p)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Administrator permission: Resend official receipt to parent"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-6 text-center text-slate-400">No payment transactions recorded for this term.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Fee Structure Edit Modal */}
      {editingFeeStructure && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Admin: Change Fee Amount</h3>
            <p className="text-xs text-slate-500">Category: <strong>{editingFeeStructure.category_name}</strong></p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={editingFeeStructure.amount}
                onChange={(e) => setEditingFeeStructure({ ...editingFeeStructure, amount: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={editingFeeStructure.description || ''}
                onChange={(e) => setEditingFeeStructure({ ...editingFeeStructure, description: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingFeeStructure(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFeeAmount}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
              >
                Save Fee Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Short Receipt Slip Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedReceiptPayment}
      />

      {/* Short SMS / WhatsApp Forwarding Modal */}
      {smsModalData && (
        <SMSWhatsAppModal
          isOpen={!!smsModalData}
          onClose={() => setSmsModalData(null)}
          title={smsModalData.title}
          messageText={smsModalData.text}
          recipientName={smsModalData.recipientName}
          recipientPhone={smsModalData.recipientPhone}
        />
      )}
    </div>
  );
};
