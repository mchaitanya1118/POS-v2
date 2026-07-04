'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { Check, X, ShieldAlert, Sparkles, HelpCircle, Package, ArrowRight } from 'lucide-react';

interface SubscriptionData {
  plan: string;
  features: {
    voice_ai: boolean;
    reservations: boolean;
    inventory: boolean;
    loyalty: boolean;
    analytics: boolean;
    delivery: boolean;
    whatsapp: boolean;
  };
}

export default function MarketplacePage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<SubscriptionData>('/api/v1/subscription');
      setSubscription(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleUpgrade = async (plan: string) => {
    try {
      setSuccessMsg(null);
      setErrorMsg(null);
      await apiClient.post('/api/v1/subscription', { plan });
      setSuccessMsg(`Plan successfully updated to ${plan.toUpperCase()}!`);
      await fetchSubscription();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Subscription change request failed.');
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '$0',
      description: 'Basic checkout and item logging for small diners',
      features: {
        reservations: false,
        loyalty: false,
        delivery: false,
        analytics: false,
        voice_ai: false,
        whatsapp: false,
      },
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      price: '$29/mo',
      description: 'Expanded capabilities for growing bistros',
      features: {
        reservations: true,
        loyalty: false,
        delivery: false,
        analytics: false,
        voice_ai: false,
        whatsapp: false,
      },
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '$99/mo',
      description: 'All core operations features for busy operations',
      features: {
        reservations: true,
        loyalty: true,
        delivery: true,
        analytics: true,
        voice_ai: false,
        whatsapp: false,
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '$299/mo',
      description: 'Complete automation suite including Voice AI & WhatsApp',
      features: {
        reservations: true,
        loyalty: true,
        delivery: true,
        analytics: true,
        voice_ai: true,
        whatsapp: true,
      },
    },
  ];

  return (
    <Navigation activeTab="marketplace">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-500" /> SaaS Add-on Marketplace
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Toggle subscription plans and activate premium restaurant automation features
            </p>
          </div>

          {subscription && (
            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-2xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 stroke-[3]" />
              <span>Active Plan: <span className="uppercase font-black">{subscription.plan}</span></span>
            </div>
          )}
        </div>

        {/* Message banners */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 dark:bg-emerald-400/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Loading subscription configurations...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => {
              const isActive = subscription?.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`glass-panel p-6 rounded-3xl flex flex-col justify-between transition-all border ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/5'
                      : 'border-slate-200/50 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">{p.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-indigo-600 text-white rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-2xl font-black text-indigo-500 tracking-tight">{p.price}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
                      {p.description}
                    </p>

                    <div className="mt-6 space-y-2.5 border-t border-slate-250 dark:border-slate-800 pt-4">
                      {Object.entries(p.features).map(([key, enabled]) => (
                        <div key={key} className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{key.replace('_', ' ')}</span>
                          {enabled ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-350 dark:text-slate-700 stroke-[3]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isActive}
                    onClick={() => handleUpgrade(p.id)}
                    className={`w-full py-2.5 mt-8 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 active-press ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-650 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                    }`}
                  >
                    {isActive ? 'Current Plan' : 'Select Plan'}
                    {!isActive && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass-panel p-6 rounded-3xl mt-4 border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 flex gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-extrabold">Feature Flag Guard Notice</span>
            <p className="text-[10px] font-semibold mt-0.5 leading-relaxed">
              Plan changes take effect instantly. If you downgrade your subscription tier, access to higher-level premium endpoints (e.g. Voice AI calls, WhatsApp logs, KDS statuses) is immediately gated by the backend service.
            </p>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
