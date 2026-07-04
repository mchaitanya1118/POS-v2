'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { useSessionStore } from '@/lib/store';
import { db } from '@/lib/db';
import { User, Settings } from '@/lib/db/types';
import { 
  Store, Shield, Users, UserPlus, Pencil, Trash2, Eye, EyeOff, 
  HelpCircle, AlertTriangle, X, Check, Trash
} from 'lucide-react';

export default function SettingsPage() {
  const activeSettings = useSessionStore(state => state.activeSettings);
  const updateSettings = useSessionStore(state => state.updateSettings);

  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('12.5');
  const [currency, setCurrency] = useState('USD');
  const [enableGst, setEnableGst] = useState(true);

  // Success message box
  const [success, setSuccess] = useState<string | null>(null);

  // Personnel management states
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPasscode, setNewUserPasscode] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff' | 'no_login'>('staff');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [showPasscodes, setShowPasscodes] = useState<Record<string, boolean>>({});

  // Factory reset states
  const [wipePasscode, setWipePasscode] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wipeSuccess, setWipeSuccess] = useState<string | null>(null);

  // Load all operators
  const loadUsers = async () => {
    try {
      const list = await db.getUsers();
      setUsers(list);
    } catch (err) {
      console.error("Failed to load operators", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUserId(user.id);
    setNewUserName(user.name);
    setNewUserRole(user.role);
    setNewUserPasscode(user.passcode || '');
    setUserError(null);
    setUserSuccess(null);
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setNewUserId('');
    setNewUserName('');
    setNewUserRole('staff');
    setNewUserPasscode('');
    setUserError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!newUserId.trim()) {
      setUserError("Please enter a valid User ID / Username.");
      return;
    }

    if (!newUserName.trim()) {
      setUserError("Please enter a valid operator name.");
      return;
    }

    // Verify User ID uniqueness if onboarding a new user
    if (!editingUser) {
      const idExists = users.some(u => u.id.toLowerCase() === newUserId.trim().toLowerCase());
      if (idExists || newUserId.trim().toLowerCase() === 'admin_user') {
        setUserError("This User ID / Username is already taken.");
        return;
      }
    }

    if (newUserRole !== 'no_login') {
      if (newUserPasscode.length < 4) {
        setUserError("Password must be at least 4 characters.");
        return;
      }
    }

    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    // Security Block: Avoid downgrading own role from admin to staff
    if (editingUser && editingUser.id === currentUserId && newUserRole === 'staff') {
      setUserError("Security Block: You cannot downgrade your own active administrator role to staff.");
      return;
    }

    const updatedUser: User = {
      id: editingUser ? editingUser.id : newUserId.trim(),
      name: newUserName,
      role: newUserRole,
      passcode: newUserRole === 'no_login' ? '' : newUserPasscode,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
    };

    try {
      await db.saveUser(updatedUser);
      setUserSuccess(editingUser ? `Operator "${newUserName}" updated successfully!` : `Operator "${newUserName}" added successfully!`);
      setNewUserId('');
      setNewUserName('');
      setNewUserPasscode('');
      setNewUserRole('staff');
      setEditingUser(null);
      await loadUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err) {
      setUserError("Failed to save operator account.");
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    if (id === currentUserId || (id === 'u_admin' && useSessionStore.getState().operatorRole === 'admin')) {
      alert("Security Block: You cannot delete your own active administrator account.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete operator "${name}"?`)) {
      return;
    }

    try {
      await db.deleteUser(id);
      setUserSuccess(`Operator "${name}" deleted successfully.`);
      await loadUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err) {
      setUserError("Failed to delete operator account.");
      console.error(err);
    }
  };

  // Prepopulate settings form
  useEffect(() => {
    if (activeSettings) {
      setRestaurantName(activeSettings.restaurantName || '');
      setAddress(activeSettings.address || '');
      setPhone(activeSettings.phone || '');
      setGstNumber(activeSettings.gstNumber || '');
      setTaxPercentage(String(activeSettings.taxPercentage ?? '12.5'));
      setCurrency(activeSettings.currency || 'USD');
      setEnableGst(activeSettings.enableGst !== false);
    }
  }, [activeSettings]);

  // Handle saving general configuration
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || isNaN(parseFloat(taxPercentage))) return;

    const updated: Settings = {
      restaurantName,
      address,
      phone,
      gstNumber,
      taxPercentage: parseFloat(taxPercentage),
      currency,
      passcode: activeSettings?.passcode || '1234',
      enableGst
    };

    try {
      await updateSettings(updated);
      setSuccess("Store settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save store settings", err);
    }
  };

  // Handle factory resetting operations data
  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setWipeError(null);
    setWipeSuccess(null);

    const targetPass = activeSettings?.passcode || '1234';
    if (wipePasscode !== targetPass) {
      setWipeError("Invalid administrator security password.");
      return;
    }

    try {
      setIsWiping(true);
      await db.wipeTransactionData();
      setWipeSuccess("Factory reset completed successfully! Operations data wiped.");
      setWipePasscode('');
      setTimeout(() => setWipeSuccess(null), 4000);
    } catch (err: any) {
      setWipeError(err.message || "Failed to execute database wipe operations.");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <Navigation activeTab="settings">
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-8 select-none">
        
        {/* Banner header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Store className="w-6 h-6 text-indigo-500" /> Platform Configuration
            </h1>
            <p className="text-xs font-semibold text-slate-405 text-slate-400 mt-0.5">
              Customize restaurant identities, taxes, system currency, active operators, and reset database partitions.
            </p>
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-2 rounded-2xl flex items-center gap-1.5 animate-bounce">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Configurations split forms */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* General profile configuration card */}
          <div className="glass-panel rounded-3xl p-6 shadow-md bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Store className="w-5 h-5 text-indigo-500" /> Store Identity & Accounting
              </h2>

              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Store Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Contact Telephone</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Store GSTIN / Tax Code</label>
                    <input
                      type="text"
                      placeholder="Enter GSTIN code..."
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">GST Tax Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">System Currency symbol</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="USD">USD ($) - US Dollars</option>
                      <option value="INR">INR (₹) - Indian Rupees</option>
                      <option value="EUR">EUR (€) - Euros</option>
                      <option value="GBP">GBP (£) - British Pounds</option>
                    </select>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between mt-2 select-none">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">Enable GST Billing</h4>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Toggle to apply or skip GST tax on customer checks</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setEnableGst(!enableGst)}
                    className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center p-1 cursor-pointer select-none ${
                      enableGst ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200"></div>
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs shadow-md transition-colors active-press"
                >
                  Save General Configurations
                </button>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-panel rounded-3xl p-6 shadow-md bg-white dark:bg-[#0b1120] border border-red-200 dark:border-red-900/50 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-red-100 dark:border-red-900/30 pb-3 text-red-650 dark:text-red-500">
                <Trash2 className="w-5 h-5" /> Danger Zone: Factory Reset Transactions
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">
                    This action will permanently delete all daily operations data, including:
                  </p>
                  <ul className="list-disc pl-5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-4 space-y-1">
                    <li>All Orders, Order Items, Payments & Kitchen Tickets</li>
                    <li>All Customer Ledger Entries, Expenses & Staff Transactions</li>
                  </ul>
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-2 text-[10px] text-red-650 dark:text-red-400 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Your configurations (Menu Items, Categories, Tables, Settings, and Personnel) will remain intact.</span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleFactoryReset} className="w-full space-y-4 select-none bg-red-500/5 border border-red-500/10 p-5 rounded-2xl mt-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-red-500 tracking-wider block mb-1">Confirm Admin Security Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter admin password..."
                  value={wipePasscode}
                  onChange={(e) => setWipePasscode(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {wipeError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl flex items-center gap-1">
                  <X className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                  <span>{wipeError}</span>
                </div>
              )}

              {wipeSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold rounded-xl flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                  <span>{wipeSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isWiping}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md transition-colors active-press cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash className="w-4 h-4" />
                {isWiping ? "Executing Factory Reset..." : "Wipe All Operations Data"}
              </button>
            </form>
          </div>

        </div>

        {/* Personnel & Access Control Management Card */}
        <div className="glass-panel rounded-3xl p-6 shadow-md bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Users className="w-5 h-5 text-indigo-500" /> Personnel & Access Control
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Operator Directory List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center select-none">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Operators</h3>
                  <p className="text-[10px] text-slate-450 font-semibold text-slate-400">Authenticated operator profiles assigned to this system tenant</p>
                </div>
                
                {userSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-extrabold px-3 py-1.5 rounded-xl animate-fade-in">
                    {userSuccess}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-xs font-semibold text-slate-400">
                    No operator profiles loaded.
                  </div>
                ) : (
                  users.map((user) => {
                    const isShown = !!showPasscodes[user.id];
                    let currentUserId = '';
                    if (typeof window !== 'undefined') {
                      currentUserId = localStorage.getItem('pos_user_id') || '';
                    }
                    const isSelfEditing = editingUser && editingUser.id === user.id;

                    return (
                      <div 
                        key={user.id} 
                        className={`flex justify-between items-center p-3 rounded-2xl border transition-all duration-200 ${
                          isSelfEditing
                            ? 'border-indigo-500/30 bg-indigo-50/10'
                            : 'border-slate-200/50 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                            user.role === 'admin' 
                              ? 'bg-rose-500/15 text-rose-500' 
                              : 'bg-indigo-500/15 text-indigo-500'
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                              {user.name}
                            </h4>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              Created on {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 select-none">
                          {/* Role Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${
                            user.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-600'
                              : user.role === 'no_login'
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-indigo-500/10 text-indigo-600'
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {user.role === 'no_login' ? 'No Login' : user.role}
                          </span>

                          {/* Login Credentials Indicator */}
                          {user.role === 'no_login' ? (
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider italic bg-slate-100 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl">
                              No Login Access
                            </span>
                          ) : (
                            <div className="flex flex-col items-end gap-0.5 bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350">
                                  ID: <span className="font-mono">{user.id}</span>
                                </span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">
                                  {isShown ? user.passcode : '••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowPasscodes(prev => ({ ...prev, [user.id]: !isShown }))}
                                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 p-0.5 cursor-pointer"
                                >
                                  {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Edit operator action */}
                          <button
                            type="button"
                            onClick={() => startEditUser(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelfEditing 
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' 
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Onboard / Edit Operator Form */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-150/50 dark:border-slate-800 rounded-2xl select-none">
              <h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-350 tracking-wider mb-4 flex items-center gap-1.5">
                {editingUser ? (
                  <>
                    <Pencil className="w-4 h-4 text-indigo-500" /> Edit Operator
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-indigo-500" /> Onboard Operator
                  </>
                )}
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">User ID / Username</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="e.g. cashier_jane"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className={newUserRole === 'no_login' ? 'space-y-4' : 'grid grid-cols-2 gap-2'}>
                  {newUserRole !== 'no_login' && (
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="e.g. ••••••••"
                        value={newUserPasscode}
                        onChange={(e) => setNewUserPasscode(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Authority Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="staff">Staff Operator (With Login)</option>
                      <option value="no_login">Staff (No System Login)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                {userError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{userError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingUser && (
                    <button
                      type="button"
                      onClick={cancelEditUser}
                      className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-750 dark:text-slate-350 font-black text-xs transition-all active-press cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-grow py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-black text-xs shadow-md transition-all active-press cursor-pointer"
                  >
                    {editingUser ? "Update Operator Details" : "Onboard Operator Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </Navigation>
  );
}
