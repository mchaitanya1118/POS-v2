'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import { Check, CreditCard, Sparkles, User, Store, Phone, Lock, Calendar, ShieldCheck, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  
  // Step navigation
  const [step, setStep] = useState<number>(1);
  
  // Input states
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'professional' | 'enterprise'>('starter');
  
  // Payment states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  // Interface states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!restaurantName || !ownerName || !phone || !username || passcode.length < 4) {
        setErrorMsg('Please populate all details. Password must be at least 4 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedPlan === 'free') {
        // Skip payment step for free plan
        handleRegisterSubmit();
      } else {
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleRegisterSubmit = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const payload = {
        restaurantName,
        ownerName,
        phone,
        username,
        passcode,
        plan: selectedPlan,
        paymentDetails: selectedPlan === 'free' ? null : {
          cardNumber,
          cardExpiry,
          cardCvv,
          cardName,
        },
      };

      const response = await apiClient.post<{
        success: boolean;
        token: string;
        user: { id: string; name: string; role: string };
        tenantId: string;
      }>('/api/v1/auth/register', payload);

      if (response && response.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_token', response.token);
          localStorage.setItem('pos_tenant_id', response.tenantId);
          localStorage.setItem('pos_role', response.user.role);
          localStorage.setItem('pos_user_name', response.user.name);
          localStorage.setItem('pos_user_id', response.user.id);
          localStorage.setItem('pos_remembered', 'true');
        }
        
        // Success redirect
        router.push('/dashboard');
      } else {
        setErrorMsg('Registration failed. Please verify your info.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Onboarding process encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const planPrices = {
    free: '$0',
    starter: '$29/mo',
    professional: '$99/mo',
    enterprise: '$299/mo',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-950">
      {/* Background radial gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-teal-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#090d16] to-[#05070f] pointer-events-none"></div>

      <div className="w-full max-w-xl relative z-10 select-none">
        <div className="bg-white dark:bg-[#0b1120] rounded-[32px] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-800/80">
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-850 dark:text-white">
              neqtra<span className="text-slate-400 ml-0.5">pos</span>
            </h1>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">
              Restaurant Onboarding Console
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-8 px-6 relative">
            <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 -z-10"></div>
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${
                  step >= num
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                {num}
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl flex gap-1.5 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Screens */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">
                {step === 3 ? 'Verifying Gateway Payment...' : 'Creating Instance...'}
              </span>
            </div>
          ) : (
            <div>
              {/* STEP 1: RESTAURANT PROFILE */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                    Step 1: Restaurant Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Restaurant Name</label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Bistro Central"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Owner / Admin Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Mehar Medavarapu"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Contact Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="e.g. +1 555-0199"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Owner Username / User ID</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. owner_admin"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Account Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          placeholder="e.g. ••••••••"
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE SUBSCRIPTION PLAN */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                    Step 2: Choose Subscription Tier
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['free', 'starter', 'professional', 'enterprise'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlan(p as any)}
                        className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${
                          selectedPlan === p
                            ? 'border-indigo-650 bg-indigo-50/5 ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 bg-transparent'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs capitalize text-slate-850 dark:text-white">{p} Plan</span>
                          <span className="text-[9px] text-slate-400 block mt-1">All core POS registers</span>
                        </div>
                        <span className="text-sm font-black text-indigo-500">{planPrices[p as keyof typeof planPrices]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: SECURE PAYMENT GATEWAY */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-500" /> Secure Payment Gateway
                    </h3>
                    <span className="text-xs font-black text-indigo-550 uppercase">
                      Total: {planPrices[selectedPlan]}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Card Number</label>
                      <input
                        type="text"
                        maxLength={16}
                        required
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          maxLength={5}
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">CVV Security Code</label>
                        <input
                          type="password"
                          maxLength={3}
                          required
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={step === 3 || (step === 2 && selectedPlan === 'free') ? handleRegisterSubmit : handleNextStep}
                  className="flex-grow py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active-press"
                >
                  {step === 3 || (step === 2 && selectedPlan === 'free') ? 'Submit & Pay' : 'Continue'}
                  {step < 3 && !(step === 2 && selectedPlan === 'free') && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Toggle to login page */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-655 uppercase tracking-wide cursor-pointer"
                >
                  Already onboarded? Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
