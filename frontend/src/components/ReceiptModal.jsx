import React, { useState } from 'react';
import { X, Printer, Share2, Copy, Check, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export const ReceiptModal = ({ isOpen, onClose, payment }) => {
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  if (!isOpen || !payment) return null;

  const receiptText = payment.receipt_text || (
    `*GREENWOOD ACADEMY RECEIPT*\n` +
    `Receipt: ${payment.receipt_number}\n` +
    `Student: ${payment.first_name || ''} ${payment.last_name || ''} (${payment.admission_number || ''})\n` +
    `Paid: $${Number(payment.amount_paid || 0).toFixed(2)}\n` +
    `Date: ${payment.payment_date || ''}\n` +
    `Method: ${(payment.payment_method || '').toUpperCase()}\n` +
    `For: ${payment.category_name || ''}\n` +
    `Balance Left: $${Number(payment.balance_after || 0).toFixed(2)}\n` +
    `Verified by Greenwood Accounts.`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResend = async () => {
    if (!isAdmin) return;
    setResending(true);
    try {
      const res = await apiClient.post(`/fees/receipts/${payment.receipt_number}/resend`, {});
      setResendStatus(res.data.message || 'Receipt resent successfully.');
      setTimeout(() => setResendStatus(''), 4000);
    } catch (err) {
      setResendStatus(`Failed: ${err.message}`);
    } finally {
      setResending(false);
    }
  };

  const cleanPhone = (payment.parent_phone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(receiptText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-navy-700 px-5 py-4 flex items-center justify-between text-white no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Payment Receipt</h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body (Clean Printable Slip) */}
        <div className="p-6 space-y-4">
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <div className="inline-block p-2 bg-navy-50 rounded-full mb-1">
              <span className="text-lg font-bold text-navy-800 tracking-wider">GREENWOOD ACADEMY</span>
            </div>
            <p className="text-xs text-slate-500">Official Payment Receipt & Voucher</p>
            <div className="mt-2 text-xs font-mono font-semibold text-brand-700 bg-brand-50 py-1 px-3 rounded-full inline-block border border-brand-200">
              {payment.receipt_number}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Student:</span>
              <span className="font-semibold text-slate-800">{payment.first_name} {payment.last_name} ({payment.admission_number})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Class:</span>
              <span className="font-medium text-slate-700">{payment.class_grade || 'Grade 9A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Fee Category:</span>
              <span className="font-medium text-slate-700">{payment.category_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Payment Date:</span>
              <span className="font-medium text-slate-700">{payment.payment_date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-slate-800 uppercase">{payment.payment_method?.replace('_', ' ')}</span>
            </div>
            {payment.reference_code && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono text-slate-700">{payment.reference_code}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 bg-emerald-50 text-emerald-900 px-2 rounded font-bold text-sm">
              <span>Amount Paid:</span>
              <span>${Number(payment.amount_paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 px-2">
              <span className="font-medium">Remaining Balance:</span>
              <span className="font-bold text-slate-800">${Number(payment.balance_after).toFixed(2)}</span>
            </div>
          </div>

          {/* Short Text Preview for SMS / WhatsApp */}
          <div className="no-print pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">SMS / WhatsApp Short Format:</span>
              <button
                onClick={handleCopy}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-emerald-300 p-2.5 rounded text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {receiptText}
            </pre>
          </div>

          {resendStatus && (
            <div className="text-xs bg-emerald-50 text-emerald-800 p-2 rounded text-center font-medium border border-emerald-200">
              {resendStatus}
            </div>
          )}

          {/* Actions */}
          <div className="no-print flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>

            {isAdmin && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-xs"
                title="Admin permission: Resend official receipt to parent"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{resending ? 'Resending...' : 'Admin: Resend Receipt via SMS'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
