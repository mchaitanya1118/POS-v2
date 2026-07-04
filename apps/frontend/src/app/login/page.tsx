'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionStore } from '@/lib/store';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState<boolean>(true);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const login = useSessionStore(state => state.login);
  const isAuthenticated = useSessionStore(state => state.isAuthenticated);

  // If already logged in, direct to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error) setError(null);

    if (!userIdInput.trim() || !passwordInput) {
      setError("Please populate all credentials.");
      return;
    }

    try {
      setLoading(true);
      const success = await login(passwordInput, remember, undefined, userIdInput.trim());
      if (success) {
        router.push('/dashboard');
      } else {
        setIsShaking(true);
        setError("Invalid User ID or Password.");
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-950">
      {/* Background radial gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-teal-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#090d16] to-[#05070f] pointer-events-none"></div>

      {/* Visual Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-slate-200/20 dark:bg-slate-800/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/20 dark:bg-slate-800/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        {/* Main Authentication Card */}
        <div className={`bg-white dark:bg-[#0b1120] rounded-[32px] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-800/80 transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>
          <div className="flex flex-col items-center">
            
            {/* Brand Logo */}
            <div className="flex flex-col items-center mb-8 select-none">
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                <span>neqtra</span><span className="text-slate-400 ml-0.5">pos</span>
              </h1>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">
                Operator Portal Sign In
              </span>
            </div>

            {error && (
              <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl flex gap-1.5 items-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Credentials Form */}
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  User ID / Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="Enter your Username"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    disabled={loading}
                    placeholder="Enter your Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] font-bold uppercase text-slate-400 tracking-wide">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-slate-350 transition-colors">
                  <input
                    type="checkbox"
                    disabled={loading}
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Remember Me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 duration-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/50 w-full text-center">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-655 uppercase tracking-wider cursor-pointer"
              >
                Register New Restaurant
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
