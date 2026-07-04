'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { MessageSquare, Plus, Send, AlertCircle, Trash2, X, Check } from 'lucide-react';

interface WhatsappTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body_text: string;
}

interface WhatsappLog {
  id: string;
  recipient_phone: string;
  direction: string;
  message_body: string;
  status: string;
  created_at: string;
}

export default function WhatsappPage() {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('marketing');
  const [templateBody, setTemplateBody] = useState('');

  // Dispatch state
  const [sendPhone, setSendPhone] = useState('');
  const [sendText, setSendText] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [templateData, logsData] = await Promise.all([
        apiClient.get<WhatsappTemplate[]>('/api/v1/whatsapp/templates'),
        apiClient.get<WhatsappLog[]>('/api/v1/whatsapp/logs'),
      ]);
      setTemplates(templateData);
      setLogs(logsData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Access Denied: Please upgrade your subscription plan to access the WhatsApp module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templateBody) return;

    try {
      await apiClient.post('/api/v1/whatsapp/templates', {
        id: `tpl-${Date.now()}`,
        name: templateName,
        category: templateCategory,
        language: 'en_US',
        bodyText: templateBody,
      });

      setShowAddModal(false);
      setTemplateName('');
      setTemplateBody('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save template.');
    }
  };

  const handleDispatchMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendPhone || !sendText) return;

    try {
      setSendSuccess(false);
      await apiClient.post('/api/v1/whatsapp/send', {
        recipientPhone: sendPhone,
        messageBody: sendText,
      });
      setSendSuccess(true);
      setSendPhone('');
      setSendText('');
      await loadData();
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch outbound message.');
    }
  };

  return (
    <Navigation activeTab="whatsapp">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-500" /> WhatsApp Campaign Hub
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Create message templates, run instant marketing dispatches, and check transaction delivery logs
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md active-press"
          >
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-655 dark:text-red-400 text-xs font-bold rounded-2xl flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Loading WhatsApp settings...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Quick Dispatch */}
            <div className="glass-panel p-6 rounded-3xl shadow-md h-fit">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" /> Direct Messaging
              </h2>

              <form onSubmit={handleDispatchMessage} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Recipient Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={sendPhone}
                    onChange={(e) => setSendPhone(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Message Text</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type dispatch content..."
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {sendSuccess && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-xl flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Outbound message queued!
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs shadow-md transition-colors active-press flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            </div>

            {/* Logs List & Templates */}
            <div className="xl:col-span-2 space-y-6">
              {/* Templates */}
              <div className="glass-panel p-6 rounded-3xl shadow-md">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">Messaging Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.length === 0 ? (
                    <p className="text-slate-400 text-xs font-bold col-span-2">No templates created yet.</p>
                  ) : (
                    templates.map((t) => (
                      <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-white">{t.name}</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 rounded">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed italic">"{t.body_text}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Logs */}
              <div className="glass-panel p-6 rounded-3xl shadow-md">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">Outbound Logs</h2>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  {logs.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 text-xs font-bold">No outbound dispatch traces available.</p>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                          <th className="p-3">Phone</th>
                          <th className="p-3">Direction</th>
                          <th className="p-3">Content Preview</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-semibold text-slate-450">
                        {logs.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-250">{l.recipient_phone}</td>
                            <td className="p-3 text-[10px] uppercase font-black tracking-wide">{l.direction}</td>
                            <td className="p-3 max-w-xs truncate">{l.message_body}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                l.status === 'sent' || l.status === 'delivered'
                                  ? 'bg-emerald-500/10 text-emerald-550'
                                  : 'bg-amber-500/10 text-amber-550'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="p-3 text-right text-[10px]">{new Date(l.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleCreateTemplate} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4">Create Outbound Template</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Template Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. order_completed_alert"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="utility">Utility notifications</option>
                  <option value="marketing">Marketing campaigns</option>
                  <option value="authentication">Auth passcode alerts</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Body Text</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Use {{1}}, {{2}} for dynamic parameter tags..."
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-350"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-grow py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Create Template
              </button>
            </div>
          </form>
        </div>
      )}
    </Navigation>
  );
}
