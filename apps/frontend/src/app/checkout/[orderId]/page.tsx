'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, Receipt, CheckCircle2, Utensils, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderItem {
  id: string;
  name?: string;
  quantity: number;
  price: number;
  subtotal: number;
  menu_items?: {
    name: string;
    description?: string;
  };
}

interface OrderData {
  id: string;
  order_number: string;
  subtotal: number;
  tax: number;
  grand_total: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function CheckoutPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [restaurantName, setRestaurantName] = useState('Infinity POS Cafe');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        const res = await fetch(`/api/v1/public/orders/${orderId}`);
        if (!res.ok) {
          throw new Error('Order not found or has been removed.');
        }
        const data = await res.json();
        setOrder(data.order);
        setRestaurantName(data.restaurantName);
        if (data.order.payment_status === 'paid') {
          setPaymentSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 16);
    // Format card number with spaces (e.g. 4444 4444 4444 4444)
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 3);
    setCardCvv(value);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3) {
      alert('Please fill in all card details correctly.');
      return;
    }

    setPaying(true);
    try {
      const res = await fetch(`/api/v1/public/orders/${orderId}/pay`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Payment processing failed. Please try again.');
      }
      
      setPaymentSuccess(true);
      
      // Confetti splash
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#030712] p-4 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Invoice Error</h2>
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400 mb-6">{error || 'Unable to locate order.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030712] py-12 px-4 transition-colors duration-300">
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ORDER INVOICE SUMMARY */}
        <div className="md:col-span-7 bg-white dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800/80 shadow-lg rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 dark:text-white">{restaurantName}</h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">Order Invoice</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-6">
            <div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block">Order Number</span>
              <span className="text-sm font-black text-slate-850 dark:text-white">{order.order_number}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block">Placed On</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Order Items</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3.5 bg-transparent">
                  <div className="min-w-0 pr-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {item.menu_items?.name || item.name || 'Menu Item'}
                    </h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">
                      {item.quantity} x ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-850 dark:text-white">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-450">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-450">
              <span>Tax (GST)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-850 dark:text-white pt-2 border-t border-dashed border-slate-100 dark:border-slate-800">
              <span>Grand Total</span>
              <span>${order.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SECURE PAYMENT GATEWAY */}
        <div className="md:col-span-5 bg-white dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800/80 shadow-lg rounded-3xl p-6 md:p-8">
          {paymentSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-lg font-black text-slate-850 dark:text-white mb-2">Payment Complete!</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Thank you for your payment. The kitchen has received your order and is currently preparing your fresh meal!
              </p>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl flex items-center gap-2.5 justify-center mb-6">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Kitchen Status: Preparing</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">You can close this tab safely.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-850 dark:text-white">Pay Securely</h2>
                  <span className="text-[9px] text-slate-450 uppercase font-extrabold block">Encrypted Payment</span>
                </div>
              </div>

              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-450 uppercase block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-450 uppercase block mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="4111 1111 1111 1111"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-450 uppercase block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-450 uppercase block mb-1">CVV</label>
                    <input
                      type="password"
                      required
                      placeholder="***"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paying}
                  className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    `Pay $${order.grand_total.toFixed(2)}`
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Powered by Infinity Pay Services</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
