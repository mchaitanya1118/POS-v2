'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { Calendar, Users, Clock, Plus, Trash2, Check, AlertCircle, X } from 'lucide-react';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  time_slot_id: string;
  status: string;
  notes?: string;
  time_slots?: {
    start_time: string;
    end_time: string;
  };
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [resData, slotData] = await Promise.all([
        apiClient.get<Reservation[]>('/api/v1/reservations'),
        apiClient.get<TimeSlot[]>('/api/v1/time-slots'),
      ]);
      setReservations(resData);
      setSlots(slotData);
      if (slotData.length > 0) {
        setSelectedSlot(slotData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Access Denied: Please upgrade your subscription plan to access the Reservations module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone || !selectedSlot) return;

    try {
      setErrorMsg(null);
      await apiClient.post('/api/v1/reservations', {
        id: `res-${Date.now()}`,
        customerName: guestName,
        customerPhone: guestPhone,
        partySize: parseInt(partySize),
        reservationDate: bookingDate,
        timeSlotId: selectedSlot,
        notes: bookingNotes,
      });

      setShowAddModal(false);
      setGuestName('');
      setGuestPhone('');
      setBookingNotes('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create reservation.');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/api/v1/reservations/${id}`, { status });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update reservation status.');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await apiClient.delete(`/api/v1/reservations/${id}`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete reservation.');
    }
  };

  return (
    <Navigation activeTab="reservations">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-500" /> Guest Reservations & Bookings
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Search table availability, schedule dinner reservations, and view scheduled covers
            </p>
          </div>

          <button
            type="button"
            disabled={slots.length === 0}
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md active-press disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Book Table
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-bold rounded-2xl flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Loading reservations calendar...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Calendar Table List */}
            <div className="glass-panel p-6 rounded-3xl shadow-md">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">Scheduled Bookings</h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                {reservations.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-xs font-bold">No guest reservations scheduled.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                        <th className="p-3">Guest</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Covers</th>
                        <th className="p-3">Booking Date</th>
                        <th className="p-3">Time Slot</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-semibold">
                      {reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-250">{r.customer_name}</td>
                          <td className="p-3 text-slate-450">{r.customer_phone}</td>
                          <td className="p-3 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {r.party_size} Guest(s)</td>
                          <td className="p-3 text-slate-450">{r.reservation_date}</td>
                          <td className="p-3 text-slate-450 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {r.time_slots ? `${r.time_slots.start_time} - ${r.time_slots.end_time}` : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              r.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-550'
                                : r.status === 'seated'
                                ? 'bg-indigo-500/10 text-indigo-550'
                                : 'bg-red-500/10 text-red-550'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex justify-end gap-1.5">
                            {r.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(r.id, 'seated')}
                                className="px-2 py-1 rounded bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-[9px] uppercase tracking-wider"
                              >
                                Seat
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(r.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleCreateBooking} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4">Book Dinning Table</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Guest Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mehar Medavarapu"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Guest Mobile</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 555-0199"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Party Size</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Time Slot</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                >
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.start_time} - {s.end_time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Remarks</label>
                <textarea
                  placeholder="Special requests, anniversary, allergic remarks..."
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
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
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      )}
    </Navigation>
  );
}
