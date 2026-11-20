import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Share2 } from 'lucide-react';

export const SMSWhatsAppModal = ({ isOpen, onClose, title, messageText, recipientPhone = '', recipientName = '' }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanPhone = (recipientPhone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const smsUrl = cleanPhone
    ? `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`
    : `sms:?body=${encodeURIComponent(messageText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-navy-700 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">{title || 'SMS & WhatsApp Short Template'}</h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {recipientName && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
              <span>Recipient: <strong className="text-slate-800">{recipientName}</strong></span>
              {recipientPhone && <span>Phone: <strong className="text-slate-800">{recipientPhone}</strong></span>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Message Content (Short SMS / WhatsApp Ready)
            </label>
            <div className="relative">
              <pre className="w-full bg-slate-900 text-emerald-300 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800 selection:bg-emerald-600">
                {messageText}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200">
            💡 <strong>Short Format Notice:</strong> This message uses concise standardized formatting and system variables ({`{student_name}`}, {`{amount}`}, {`{receipt_number}`}, {`{balance}`}) so it fits seamlessly into SMS quotas or can be forwarded directly via WhatsApp.
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg text-xs shadow transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Forward via WhatsApp</span>
            </a>

            <a
              href={smsUrl}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-lg text-xs shadow transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send via Phone SMS</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
