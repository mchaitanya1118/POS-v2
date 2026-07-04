'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { PhoneCall, Play, Mic, AlertCircle, Save, Check } from 'lucide-react';

interface VoiceSettings {
  greeting_message: string;
  voice_model: string;
  enable_bookings: boolean;
}

interface VoiceCall {
  id: string;
  caller_number: string;
  status: string;
  duration: number;
  transcription?: string;
  created_at: string;
}

export default function VoiceAiPage() {
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [greeting, setGreeting] = useState('');
  const [model, setModel] = useState('en-US-Neural-F');
  const [bookingsEnabled, setBookingsEnabled] = useState(true);

  // Vapi Portal states
  const [tenantId, setTenantId] = useState('default-tenant-id');
  const [activeTab, setActiveTab] = useState<'getMenu' | 'createReservation' | 'createOrder'>('getMenu');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTenantId(localStorage.getItem('pos_tenant_id') || 'default-tenant-id');
    }
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [settingsData, callsData] = await Promise.all([
        apiClient.get<VoiceSettings>('/api/v1/voice-ai/settings'),
        apiClient.get<VoiceCall[]>('/api/v1/voice-ai/calls'),
      ]);
      setSettings(settingsData);
      setCalls(callsData);

      if (settingsData) {
        setGreeting(settingsData.greeting_message);
        setModel(settingsData.voice_model);
        setBookingsEnabled(settingsData.enable_bookings);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Access Denied: Please upgrade your subscription plan to access the Voice AI Receptionist module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      setSaveSuccess(false);
      await apiClient.post('/api/v1/voice-ai/settings', {
        greetingMessage: greeting,
        voiceModel: model,
        enableBookings: bookingsEnabled,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update Voice AI settings.');
    }
  };

  // Vapi JSON Schema strings
  const toolSchemas = {
    getMenu: JSON.stringify({
      name: "getMenu",
      description: "Fetches the list of all available menu items, their prices, and descriptions from the restaurant's menu.",
      parameters: {
        type: "object",
        properties: {}
      }
    }, null, 2),
    createReservation: JSON.stringify({
      name: "createReservation",
      description: "Creates a new table booking/reservation for a guest.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "The guest's full name." },
          customerPhone: { type: "string", description: "The guest's contact phone number." },
          partySize: { type: "integer", description: "The size of the party (number of guests)." },
          reservationDate: { type: "string", description: "The date of the reservation in YYYY-MM-DD format." },
          reservationTime: { type: "string", description: "The time of the reservation (e.g. '7:30 PM' or '19:30')." },
          notes: { type: "string", description: "Any special requests or notes from the guest." }
        },
        required: ["customerName", "customerPhone", "partySize", "reservationDate", "reservationTime"]
      }
    }, null, 2),
    createOrder: JSON.stringify({
      name: "createOrder",
      description: "Places a food order in the POS system and sends a kitchen ticket.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "List of food/drink items to order.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Case-insensitive name of the item (e.g. Margherita Pizza)." },
                quantity: { type: "integer", description: "Quantity to order." }
              },
              required: ["name", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    }, null, 2)
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/public/voice-ai/${tenantId}/vapi`
    : `http://localhost:3001/api/v1/public/voice-ai/${tenantId}/vapi`;

  return (
    <Navigation activeTab="voice-ai">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Mic className="w-6 h-6 text-indigo-500" /> Voice AI Front-Desk Receptionist
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Configure AI voice model greetings, booking behaviors, and connect with Vapi Assistants
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-bold rounded-2xl flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Loading Voice AI modules...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Vapi Connection Portal Card */}
            <div className="glass-panel p-6 rounded-3xl shadow-md">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-500" /> Vapi Assistant Connection Portal
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left side: Webhook URL info */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider block mb-1">Step 1: Configure Webhook URL in Vapi Settings</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Copy the public URL below and paste it into the <strong>Server URL</strong> (Webhooks) field of your Vapi Assistant or Vapi Phone Number:
                    </p>
                    
                    <div className="flex gap-2 items-center bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 select-all font-mono text-[10px] break-all">
                      <span className="flex-1 text-slate-700 dark:text-slate-300">{webhookUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(webhookUrl, 'webhook')}
                        className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 select-none shrink-0"
                      >
                        {copiedText === 'webhook' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block mb-1">Voice Assistant Capability Details:</span>
                    <ul className="list-disc pl-4 text-[10px] text-slate-400 space-y-1">
                      <li><strong>Automatic Menu Sync:</strong> Fetches all items directly from the database.</li>
                      <li><strong>Live Reservation Booking:</strong> Confirms date/party slots via webhook.</li>
                      <li><strong>Direct POS Orders Placement:</strong> Matches dishes by name and dispatches tickets to the kitchen screen.</li>
                    </ul>
                  </div>
                </div>

                {/* Right side: JSON schemas for assistant tools */}
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider block mb-1">Step 2: Add Assistant Function Tools</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Add a custom function tool in Vapi for each action the Assistant needs to take, then copy the JSON schema below:
                    </p>

                    {/* Tab Switcher */}
                    <div className="flex gap-1.5 bg-slate-200/50 dark:bg-slate-900 p-1 rounded-xl mb-3">
                      {(['getMenu', 'createReservation', 'createOrder'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                            activeTab === tab
                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-550'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schema Display block */}
                  <div className="relative flex-grow flex flex-col justify-between gap-3">
                    <pre className="bg-slate-900 text-slate-300 font-mono text-[9px] p-3 rounded-xl overflow-x-auto max-h-48 border border-slate-800 leading-normal flex-1">
                      {toolSchemas[activeTab]}
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleCopy(toolSchemas[activeTab], activeTab)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] uppercase rounded-xl select-none"
                    >
                      {copiedText === activeTab ? `Copied ${activeTab} tool schema!` : `Copy ${activeTab} tool schema`}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Settings Card */}
              <div className="glass-panel p-6 rounded-3xl shadow-md h-fit">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-500" /> Assistant Greeting Configuration
                </h2>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Voice Greeting Message</label>
                    <textarea
                      required
                      value={greeting}
                      onChange={(e) => setGreeting(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Voice AI Model</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="en-US-Neural-F">en-US Female Neural Voice (Ruby)</option>
                      <option value="en-US-Neural-M">en-US Male Neural Voice (David)</option>
                      <option value="en-IN-Neural-F">en-IN Indian Female Accent (Swara)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-200">Auto Booking Schedule</h4>
                      <p className="text-[9px] font-semibold text-slate-400">Allow AI to insert reservations</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingsEnabled(!bookingsEnabled)}
                      className={`w-10 h-5.5 rounded-full p-1 cursor-pointer transition-all duration-200 flex items-center ${
                        bookingsEnabled ? 'bg-indigo-650 justify-end' : 'bg-slate-350 justify-start'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 bg-white rounded-full shadow-md"></div>
                    </button>
                  </div>

                  {saveSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-xl flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Settings updated successfully!
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs shadow-md transition-colors active-press flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Configuration
                  </button>
                </form>
              </div>

              {/* Inbound Call Traces */}
              <div className="xl:col-span-2 glass-panel p-6 rounded-3xl shadow-md flex flex-col min-h-[500px]">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">Inbound Call Logs</h2>
                <div className="flex-grow overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  {calls.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 text-xs font-bold">No phone calls logged yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {calls.map((c) => (
                        <div key={c.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/10 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <PhoneCall className="w-4 h-4 text-indigo-500" /> {c.caller_number}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                          </div>

                          <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                            <span>Status: <span className="capitalize text-slate-500 font-extrabold">{c.status}</span></span>
                            <span>Duration: <span className="text-slate-500 font-extrabold">{c.duration}s</span></span>
                          </div>

                          {c.transcription && (
                            <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-850/60 rounded-xl text-[11px] leading-relaxed text-slate-550 dark:text-slate-350 italic border-l-2 border-indigo-500">
                              "{c.transcription}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navigation>
  );
}
