'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/lib/api-client';
import { Truck, Plus, Check, AlertCircle, Users, ClipboardList, Trash2, X } from 'lucide-react';

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  vehicle_number?: string;
  status: string; // available, busy, offline
}

interface DeliveryOrder {
  id: string;
  order_id: string;
  agent_id?: string;
  status: string; // pending, assigned, picked_up, delivered, cancelled
  customer_address: string;
  estimated_delivery_time?: string;
  orders?: {
    order_number: string;
    grand_total: number;
  };
}

export default function DeliveryPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Agent Form State
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');

  // Dispatch Form State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [estTime, setEstTime] = useState('30 mins');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [agentsData, deliveryOrdersData] = await Promise.all([
        apiClient.get<DeliveryAgent[]>('/api/v1/delivery/agents'),
        apiClient.get<DeliveryOrder[]>('/api/v1/delivery/orders'),
      ]);
      setAgents(agentsData);
      setDeliveryOrders(deliveryOrdersData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Access Denied: Please upgrade your subscription plan to access the Delivery module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName || !agentPhone) return;

    try {
      await apiClient.post('/api/v1/delivery/agents', {
        id: `agent-${Date.now()}`,
        name: agentName,
        phone: agentPhone,
        vehicleNumber: vehicleNo,
        status: 'available',
      });

      setShowAgentModal(false);
      setAgentName('');
      setAgentPhone('');
      setVehicleNo('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register delivery agent.');
    }
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedAgent || !custAddress) return;

    try {
      await apiClient.post('/api/v1/delivery/orders', {
        id: `del-ord-${Date.now()}`,
        orderId: selectedOrder,
        agentId: selectedAgent,
        status: 'assigned',
        customerAddress: custAddress,
        estimatedDeliveryTime: estTime,
      });

      setShowDispatchModal(false);
      setSelectedOrder('');
      setSelectedAgent('');
      setCustAddress('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch order.');
    }
  };

  const handleUpdateStatus = async (orderId: string, agentId: string | undefined, status: string) => {
    try {
      await apiClient.post('/api/v1/delivery/orders', {
        orderId,
        agentId,
        status,
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update delivery order status.');
    }
  };

  return (
    <Navigation activeTab="delivery">
      <div className="flex-1 flex flex-col gap-6 select-none">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-indigo-500" /> Delivery Dispatch Console
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Onboard delivery riders, assign active POS orders, and track real-time dispatch trips
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAgentModal(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-4 h-4" /> Add Rider
            </button>
            <button
              type="button"
              onClick={() => setShowDispatchModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-1.5 shadow-md active-press"
            >
              <Truck className="w-4 h-4" /> Dispatch Order
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 dark:bg-red-400/5 border border-red-500/20 text-red-655 dark:text-red-400 text-xs font-bold rounded-2xl flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
            Loading delivery modules...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Active Riders Grid */}
            <div className="glass-panel p-6 rounded-3xl shadow-md h-fit">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Active Delivery Riders
              </h2>

              <div className="space-y-3">
                {agents.length === 0 ? (
                  <p className="text-slate-400 text-xs font-bold">No riders registered yet.</p>
                ) : (
                  agents.map((a) => (
                    <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex justify-between items-center text-xs font-semibold">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-250">{a.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{a.phone} | {a.vehicle_number || 'No Vehicle'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        a.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-550'
                          : a.status === 'busy'
                          ? 'bg-amber-500/10 text-amber-550'
                          : 'bg-slate-350 text-slate-500'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Dispatch Orders list */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-3xl shadow-md min-h-[500px] flex flex-col">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-500" /> Active Dispatch Statuses
              </h2>

              <div className="flex-grow overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                {deliveryOrders.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-xs font-bold">No orders dispatched yet.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Recipient Address</th>
                        <th className="p-3">Rider</th>
                        <th className="p-3">Trip Status</th>
                        <th className="p-3 text-right">Est. Time</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-semibold text-slate-450">
                      {deliveryOrders.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-250">
                            {d.orders?.order_number || d.order_id.slice(-6).toUpperCase()}
                          </td>
                          <td className="p-3 max-w-[180px] truncate">{d.customer_address}</td>
                          <td className="p-3">
                            {agents.find((a) => a.id === d.agent_id)?.name || 'Unassigned'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              d.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-550'
                                : d.status === 'assigned' || d.status === 'picked_up'
                                ? 'bg-indigo-500/10 text-indigo-550'
                                : 'bg-red-500/10 text-red-550'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3 text-right text-[10px]">{d.estimated_delivery_time || 'N/A'}</td>
                          <td className="p-3 text-right">
                            {d.status === 'assigned' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(d.order_id, d.agent_id, 'delivered')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-wider"
                              >
                                Delivered
                              </button>
                            )}
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

      {/* Add Rider Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleRegisterAgent} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowAgentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4">Register Delivery Rider</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Rider Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rider Dave"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 555-0999"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  placeholder="e.g. M-1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAgentModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-350"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-grow py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Onboard Rider
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatch Order Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleDispatchOrder} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowDispatchModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4">Dispatch active POS Order</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">POS Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter POS order ID..."
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Available Rider</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="">Select a rider...</option>
                  {agents.filter((a) => a.status === 'available').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Destination Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street details..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Est. Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 45 mins"
                  value={estTime}
                  onChange={(e) => setEstTime(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-350"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedAgent || !selectedOrder}
                className="flex-grow py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Start Dispatch Trip
              </button>
            </div>
          </form>
        </div>
      )}
    </Navigation>
  );
}
