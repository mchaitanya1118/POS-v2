'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { Activity, ShieldCheck, Cpu, HardDrive, Clock, CheckCircle, AlertOctagon } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: string;
    error?: string;
  };
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      // /health is public and bypasses headers/auth, we query it directly
      const data = await apiClient.get<HealthData>('/health');
      setHealth(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to ping backend diagnostics server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto refresh status every 15 seconds
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor((seconds % (3600*24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <Navigation activeTab="health">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-500 animate-pulse" /> Platform Diagnostics & Health
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Real-time monitoring of backend process uptimes, API latencies, and database connections
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHealth}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Refresh Status
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-bold rounded-2xl flex gap-2 items-center">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && !health ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Querying health check endpoints...
          </div>
        ) : (
          health && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall status */}
              <div className="glass-panel p-6 rounded-3xl shadow-md flex items-center gap-4 border border-slate-200/50 dark:border-slate-800">
                <CheckCircle className={`w-10 h-10 ${health.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'} shrink-0`} />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Server Status</span>
                  <span className="text-xl font-extrabold text-slate-850 dark:text-white capitalize">{health.status}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="glass-panel p-6 rounded-3xl shadow-md flex items-center gap-4 border border-slate-200/50 dark:border-slate-800">
                <Clock className="w-10 h-10 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Backend Uptime</span>
                  <span className="text-base font-extrabold text-slate-850 dark:text-white">{formatUptime(health.uptimeSeconds)}</span>
                </div>
              </div>

              {/* DB Connectivity */}
              <div className="glass-panel p-6 rounded-3xl shadow-md flex items-center gap-4 border border-slate-200/50 dark:border-slate-800">
                <HardDrive className={`w-10 h-10 ${health.database.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'} shrink-0`} />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Database Sync Status</span>
                  <span className="text-base font-extrabold text-slate-850 dark:text-white capitalize">{health.database.status}</span>
                </div>
              </div>

              {/* Error messages if any */}
              {health.database.status !== 'healthy' && health.database.error && (
                <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-red-500/20 bg-red-500/5 text-red-550 dark:text-red-400 text-xs font-semibold">
                  <h4 className="font-extrabold text-sm mb-2">PostgreSQL Connectivity Diagnostics:</h4>
                  <pre className="p-3 bg-red-950/20 dark:bg-black/30 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed">
                    {health.database.error}
                  </pre>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </Navigation>
  );
}
