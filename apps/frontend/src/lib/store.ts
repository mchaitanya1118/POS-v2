import { create } from 'zustand';
import { db } from './db';
import { Settings, MenuItem, User } from './db/types';
import { apiClient } from './api-client';

interface SessionState {
  isAuthenticated: boolean;
  operatorRole: 'admin' | 'staff' | 'no_login' | null;
  operatorName: string | null;
  activeSettings: Settings | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  loadSession: () => Promise<void>;
  login: (passcode: string, remember: boolean, tenantId?: string, userId?: string) => Promise<boolean>;
  logout: () => void;
  updateSettings: (settings: Settings) => Promise<void>;
  toggleTheme: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isAuthenticated: false,
  operatorRole: null,
  operatorName: null,
  activeSettings: null,
  theme: 'dark', // Locked to premium dark mode as default
  isLoading: true,

  loadSession: async () => {
    try {
      set({ isLoading: true });
      
      let theme: 'light' | 'dark' = 'dark';
      let isAuthenticated = false;
      let operatorRole: 'admin' | 'staff' | null = null;
      let operatorName: string | null = null;

      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('pos_token');
        const rememberState = localStorage.getItem('pos_remembered');
        if (token && rememberState === 'true') {
          isAuthenticated = true;
          operatorRole = localStorage.getItem('pos_role') as 'admin' | 'staff' || 'staff';
          operatorName = localStorage.getItem('pos_user_name') || 'Staff Member';
        }
      }

      set({ theme: 'dark', isAuthenticated, operatorRole, operatorName, isLoading: false });
      
      if (isAuthenticated) {
        // Load settings asynchronously to not block initial app rendering
        db.getSettings().then(settings => {
          set({ activeSettings: settings });
        }).catch(err => {
          console.error("Failed to fetch settings in background", err);
        });
      }

      // Enforce light mode class on html root element
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error("Failed to load session details", err);
      set({ isLoading: false });
    }
  },

  login: async (passcode: string, remember: boolean, tenantId?: string, userId?: string) => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        token: string;
        user: { id: string; name: string; role: 'admin' | 'staff' };
        tenantId: string;
      }>('/api/v1/auth/login', { passcode, tenantId, userId });

      if (response && response.token) {
        set({
          isAuthenticated: true,
          operatorRole: response.user.role,
          operatorName: response.user.name,
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_token', response.token);
          localStorage.setItem('pos_tenant_id', response.tenantId);
          localStorage.setItem('pos_role', response.user.role);
          localStorage.setItem('pos_user_name', response.user.name);
          localStorage.setItem('pos_user_id', response.user.id);
          if (remember) {
            localStorage.setItem('pos_remembered', 'true');
          }
        }
        
        // Fetch settings immediately on login
        try {
          const settings = await db.getSettings();
          set({ activeSettings: settings });
        } catch (err) {
          console.error("Failed to fetch settings on login:", err);
        }

        return true;
      }
    } catch (err) {
      console.warn("Authentication request failed:", err);
    }
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false, operatorRole: null, operatorName: null, activeSettings: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_tenant_id');
      localStorage.removeItem('pos_remembered');
      localStorage.removeItem('pos_role');
      localStorage.removeItem('pos_user_name');
      localStorage.removeItem('pos_user_id');
    }
  },

  updateSettings: async (settings: Settings) => {
    await db.saveSettings(settings);
    set({ activeSettings: settings });
  },

  toggleTheme: () => {
    // Locked to dark theme permanently
  },
}));

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  selectedTableId: string | null;
  selectedCustomerId: string | null;
  discountAmount: number; // Flat discount
  taxRate: number; // e.g. 12.5
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;
  setTable: (tableId: string | null) => void;
  setCustomer: (customerId: string | null) => void;
  setDiscount: (amount: number) => void;
  setTaxRate: (rate: number) => void;
  setEditingOrder: (orderId: string | null, orderNumber: string | null) => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedTableId: null,
  selectedCustomerId: null,
  discountAmount: 0,
  taxRate: 12.5,
  editingOrderId: null,
  editingOrderNumber: null,

  addItem: (item: MenuItem) => {
    if (!item.isAvailable) return;
    const currentItems = get().items;
    const index = currentItems.findIndex(i => i.item.id === item.id);
    if (index >= 0) {
      const copy = [...currentItems];
      copy[index].quantity += 1;
      set({ items: copy });
    } else {
      set({ items: [...currentItems, { item, quantity: 1 }] });
    }
  },

  removeItem: (itemId: string) => {
    set({ items: get().items.filter(i => i.item.id !== itemId) });
  },

  decreaseQuantity: (itemId: string) => {
    const currentItems = get().items;
    const index = currentItems.findIndex(i => i.item.id === itemId);
    if (index >= 0) {
      const copy = [...currentItems];
      if (copy[index].quantity > 1) {
        copy[index].quantity -= 1;
        set({ items: copy });
      } else {
        set({ items: currentItems.filter(i => i.item.id !== itemId) });
      }
    }
  },

  setTable: (tableId: string | null) => set({ selectedTableId: tableId }),
  setCustomer: (customerId: string | null) => set({ selectedCustomerId: customerId }),
  setDiscount: (amount: number) => set({ discountAmount: Math.max(0, amount) }),
  setTaxRate: (rate: number) => set({ taxRate: Math.max(0, rate) }),
  setEditingOrder: (orderId: string | null, orderNumber: string | null) => set({ editingOrderId: orderId, editingOrderNumber: orderNumber }),
  clearCart: () => set({ items: [], selectedTableId: null, selectedCustomerId: null, discountAmount: 0, editingOrderId: null, editingOrderNumber: null }),

  getTotals: () => {
    const items = get().items;
    const discount = get().discountAmount;
    const taxRate = get().taxRate;

    const subtotal = items.reduce((sum, current) => sum + current.item.price * current.quantity, 0);
    
    // Check if GST is enabled in settings
    const sessionStore = useSessionStore.getState();
    const isGstEnabled = sessionStore.activeSettings?.enableGst !== false;

    const tax = isGstEnabled ? Math.max(0, (subtotal - discount) * (taxRate / 100)) : 0;
    const grandTotal = Math.max(0, subtotal - discount + tax);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    };
  },
}));
