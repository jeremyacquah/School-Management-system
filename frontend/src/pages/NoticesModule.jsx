import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { SMSWhatsAppModal } from '../components/SMSWhatsAppModal';
import {
  Bell,
  Send,
  Share2,
  Copy,
  Trash2,
  CheckCircle,
  MessageSquare,
  Users,
  AlertCircle
} from 'lucide-react';

export const NoticesModule = () => {
  const { role, isAdmin, isParent } = useAuth();
  const [notices, setNotices] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Admin New Broadcast Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal'
  });

  const [activeTemplateModal, setActiveTemplateModal] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadNotices();
    loadTemplates();
  }, [role]);

  const loadNotices = async () => {
    try {
      const res = await apiClient.get('/notices');
      setNotices(res.data || []);
    } catch (e) {
      console.warn('Notices error:', e);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await apiClient.get('/notices/templates');
      setTemplates(res.data || []);
    } catch (e) {
      console.warn('Templates error:', e);
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatusMsg('');
    try {
      const res = await apiClient.post('/notices', {
        title: formData.title,
        content: formData.content,
        target_audience: formData.target_audience,
        priority: formData.priority,
        term_id: 1,
        week_id: 5
      });
      setStatusMsg(res.data.message || 'Notice broadcast successfully!');
      setFormData({ title: '', content: '', target_audience: 'all', priority: 'normal' });
      loadNotices();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Broadcast Error: ${err.message}`);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!isAdmin) return;
    if (!confirm('Delete this broadcast notice?')) return;
    try {
      await apiClient.delete(`/notices/${id}`);
      loadNotices();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const handleApplyTemplate = (tpl) => {
    let replaced = tpl.template
      .replace('{student_name}', 'Ethan Miller')
      .replace('{balance}', '240.00')
      .replace('{term_name}', 'Term 1 (2026/2027)')
      .replace('{status}', 'Absent')
      .replace('{date}', new Date().toISOString().split('T')[0])
      .replace('{week_number}', '5');

    setActiveTemplateModal({
      title: tpl.name,
      text: replaced,
      recipientName: 'David Miller (Parent of Ethan Miller)',
      recipientPhone: '+1-555-0192'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {isParent ? 'School Notices & Messages' : 'Module 6: Notices & Messaging Broadcasts'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isParent
              ? 'Official school announcements and messages sent to parents by Greenwood Academy administration.'
              : 'Admin broadcasts one-way notices to students and parents • Short SMS & WhatsApp templates with variables.'}
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {isParent ? '🔒 Verified Parent Feed' : 'One-Way School Broadcast Mode'}
        </span>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {statusMsg}
        </div>
      )}

      {/* Pre-Configured Short Templates for SMS & WhatsApp (Admin/Staff only) */}
      {!isParent && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Quick Short SMS & WhatsApp Forwarding Templates</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {templates.map(tpl => (
              <div key={tpl.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between text-xs space-y-2 hover:border-brand-400 transition-colors">
                <div>
                  <strong className="text-slate-900 block font-bold">{tpl.name}</strong>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-3 italic">
                    "{tpl.template}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Format & Forward</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Broadcast Creation Form */}
        {isAdmin && (
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-brand-600" />
              <span>Admin: Publish Broadcast Notice</span>
            </h3>

            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value="all">All School (Students, Parents, Staff)</option>
                  <option value="parents">Parents Only</option>
                  <option value="students">Students Only</option>
                  <option value="staff">Staff / Teachers Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value="normal">Normal Announcement</option>
                  <option value="urgent">Urgent Alert</option>
                  <option value="announcement">Official Session Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Term 1 Midterm Progress Reports"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Notice Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter message details for broadcast..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast to Selected Audience</span>
              </button>
            </form>
          </div>
        )}

        {/* Notices Feed */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                {isParent ? 'Official Announcements & Administrative Messages' : 'School Broadcast Feed'}
              </span>
              <span className="text-xs text-slate-500">{notices.length} active announcements</span>
            </div>

            <div className="space-y-3">
              {notices.map(n => (
                <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">{n.title}</strong>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        n.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {n.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{n.created_at?.split(' ')[0] || 'Term 1'}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteNotice(n.id)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                          title="Admin: Delete notice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-xs">{n.content}</p>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    <span>From: <strong>{n.sent_by || 'School Administration'}</strong></span>
                    {!isParent && (
                      <button
                        onClick={() => {
                          setActiveTemplateModal({
                            title: n.title,
                            text: `*GREENWOOD ACADEMY NOTICE*\n${n.title}\n${n.content}\nIssued by Greenwood Administration.`,
                            recipientName: 'School Community'
                          });
                        }}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Forward Notice</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {notices.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No announcements at this time.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Short Template Forwarding Modal */}
      {activeTemplateModal && (
        <SMSWhatsAppModal
          isOpen={!!activeTemplateModal}
          onClose={() => setActiveTemplateModal(null)}
          title={activeTemplateModal.title}
          messageText={activeTemplateModal.text}
          recipientName={activeTemplateModal.recipientName}
          recipientPhone={activeTemplateModal.recipientPhone}
        />
      )}
    </div>
  );
};
