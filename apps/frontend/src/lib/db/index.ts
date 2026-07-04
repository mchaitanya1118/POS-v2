import { apiClient } from '../api-client';
import { Settings, User, Table, MenuCategory, MenuItem, Customer, CustomerLedger, ExpenseCategory, Expense, Order, OrderItem, Payment, PendingPayment, KitchenTicket, AuditLog, StaffTransaction } from './types';
import { triggerN8nWebhook } from '../n8n';

// Log the active connection profile to the browser developer console
if (typeof window !== 'undefined') {
  console.log(
    "%c Neqtra POS Active DB Mode: MULTI-TENANT ENTERPRISE API GATEWAY ",
    "background: #8B5CF6; color: white; font-weight: bold; padding: 4px; border-radius: 4px;"
  );
}

export const db = {
  // Settings
  getSettings: async (): Promise<Settings> => {
    return apiClient.get<Settings>('/api/v1/settings');
  },
  saveSettings: async (settings: Settings): Promise<void> => {
    await apiClient.post('/api/v1/settings', settings);
  },

  // Tables
  getTables: async (): Promise<Table[]> => {
    const list = await apiClient.get<any[]>('/api/v1/tables');
    return list.map(item => ({
      id: item.id,
      tableNumber: item.table_number,
      capacity: item.capacity,
      status: item.status,
      createdAt: item.created_at,
    }));
  },
  saveTable: async (table: Table): Promise<void> => {
    await apiClient.post('/api/v1/tables', table);
  },
  deleteTable: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/tables/${id}`);
  },

  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    const list = await apiClient.get<any[]>('/api/v1/categories');
    return list.map(item => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      createdAt: item.created_at,
    }));
  },
  saveCategory: async (category: MenuCategory): Promise<void> => {
    await apiClient.post('/api/v1/categories', category);
  },
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/categories/${id}`);
  },

  // Menu Items
  getMenuItems: async (): Promise<MenuItem[]> => {
    const list = await apiClient.get<any[]>('/api/v1/menu-items');
    return list.map(item => ({
      id: item.id,
      name: item.name,
      categoryId: item.category_id,
      description: item.description,
      price: item.price,
      imageUrl: item.image_url,
      isAvailable: item.is_available,
      createdAt: item.created_at,
    }));
  },
  saveMenuItem: async (item: MenuItem): Promise<void> => {
    await apiClient.post('/api/v1/menu-items', item);
  },
  deleteMenuItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/menu-items/${id}`);
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    return apiClient.get<Customer[]>('/api/v1/customers');
  },
  saveCustomer: async (customer: Customer): Promise<void> => {
    await apiClient.post('/api/v1/customers', customer);
    triggerN8nWebhook('customer.saved', customer);
  },
  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/customers/${id}`);
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    const list = await apiClient.get<any[]>('/api/v1/orders');
    return list.map(item => ({
      id: item.id,
      orderNumber: item.order_number,
      tableId: item.table_id,
      customerId: item.customer_id,
      subtotal: item.subtotal,
      tax: item.tax,
      discount: item.discount,
      grandTotal: item.grand_total,
      status: item.status,
      paymentStatus: item.payment_status,
      createdAt: item.created_at,
    }));
  },
  getOrderItems: async (): Promise<OrderItem[]> => {
    const list = await apiClient.get<any[]>('/api/v1/orders/items');
    return list.map(item => ({
      id: item.id,
      orderId: item.order_id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      createdAt: item.created_at,
    }));
  },
  saveOrder: async (order: Order, items: OrderItem[]): Promise<void> => {
    await apiClient.post('/api/v1/orders', { order, items });
    triggerN8nWebhook('order.saved', { order, items });
  },

  // Payments
  getPayments: async (): Promise<Payment[]> => {
    const list = await apiClient.get<any[]>('/api/v1/payments');
    return list.map(item => ({
      id: item.id,
      orderId: item.order_id,
      paymentType: item.payment_type,
      amountPaid: item.amount_paid,
      paymentMethod: item.payment_method,
      details: item.details,
      createdAt: item.created_at,
    }));
  },
  savePayment: async (payment: Payment): Promise<void> => {
    await apiClient.post('/api/v1/payments', payment);
    triggerN8nWebhook('payment.saved', payment);
  },

  // Pending Payments
  getPendingPayments: async (): Promise<PendingPayment[]> => {
    const list = await apiClient.get<any[]>('/api/v1/pending-payments');
    return list.map(item => ({
      id: item.id,
      orderId: item.order_id,
      customerId: item.customer_id,
      amountDue: item.amount_due,
      dueDate: item.due_date,
      status: item.status,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  savePendingPayment: async (pp: PendingPayment): Promise<void> => {
    await apiClient.post('/api/v1/pending-payments', pp);
  },
  deletePendingPayment: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/pending-payments/${id}`);
  },

  // Customer Ledger
  getCustomerLedger: async (): Promise<CustomerLedger[]> => {
    const list = await apiClient.get<any[]>('/api/v1/customers/ledger');
    return list.map(item => ({
      id: item.id,
      customerId: item.customer_id,
      transactionType: item.transaction_type,
      amount: item.amount,
      balance: item.balance,
      transactionDate: item.transaction_date,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  saveLedgerEntry: async (entry: CustomerLedger): Promise<void> => {
    await apiClient.post('/api/v1/customers/ledger', entry);
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const list = await apiClient.get<any[]>('/api/v1/expenses');
    return list.map(item => ({
      id: item.id,
      date: item.date,
      categoryId: item.category_id,
      description: item.description,
      amount: item.amount,
      paymentMethod: item.payment_method,
      createdAt: item.created_at,
    }));
  },
  saveExpense: async (expense: Expense): Promise<void> => {
    await apiClient.post('/api/v1/expenses', expense);
    triggerN8nWebhook('expense.saved', expense);
  },
  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`);
  },

  // Expense Categories
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const list = await apiClient.get<any[]>('/api/v1/expense-categories');
    return list.map(item => ({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
    }));
  },

  // Kitchen Tickets
  getKitchenTickets: async (): Promise<KitchenTicket[]> => {
    const list = await apiClient.get<any[]>('/api/v1/kitchen-tickets');
    return list.map(item => ({
      id: item.id,
      orderId: item.order_id,
      tableId: item.table_id,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },
  saveKitchenTicket: async (ticket: KitchenTicket): Promise<void> => {
    await apiClient.post('/api/v1/kitchen-tickets', ticket);
  },
  deleteKitchenTicket: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/kitchen-tickets/${id}`);
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const list = await apiClient.get<any[]>('/api/v1/audit-logs');
    return list.map(item => ({
      id: item.id,
      operator: item.operator,
      action: item.action,
      oldValue: item.old_value,
      newValue: item.new_value,
      details: item.details,
      createdAt: item.created_at,
    }));
  },
  saveAuditLog: async (log: AuditLog): Promise<void> => {
    await apiClient.post('/api/v1/audit-logs', log);
  },

  // Users & Personnel
  getUsers: async (): Promise<User[]> => {
    const list = await apiClient.get<any[]>('/api/v1/users');
    return list.map(item => ({
      id: item.id,
      name: item.name,
      passcode: item.passcode,
      role: item.role as any,
      createdAt: item.created_at,
    }));
  },
  saveUser: async (user: User): Promise<void> => {
    await apiClient.post('/api/v1/users', user);
  },
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${id}`);
  },

  // Staff Transactions
  getStaffTransactions: async (): Promise<StaffTransaction[]> => {
    const list = await apiClient.get<any[]>('/api/v1/staff-transactions');
    return list.map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type as any,
      amount: item.amount,
      date: item.date,
      paymentMethod: item.payment_method as any,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  saveStaffTransaction: async (transaction: StaffTransaction): Promise<void> => {
    await apiClient.post('/api/v1/staff-transactions', transaction);
  },
  deleteStaffTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/staff-transactions/${id}`);
  },

  // Subscription & Feature Flags
  getSubscription: async (): Promise<any> => {
    return apiClient.get('/api/v1/subscription');
  },
  updateSubscription: async (plan: string, billingCycle?: string): Promise<any> => {
    return apiClient.post('/api/v1/subscription', { plan, billingCycle });
  },
  getFeatures: async (): Promise<Record<string, boolean>> => {
    return apiClient.get<Record<string, boolean>>('/api/v1/features');
  },

  // Database Lifecycle & Utilities
  onDatabaseUpdate: (callback: () => void): (() => void) => {
    // In HTTP client mode, we can optionally poll or fallback.
    // For simple integration, we just return a no-op cleanup.
    return () => {};
  },
  wipeTransactionData: async (): Promise<void> => {
    await apiClient.post('/api/v1/wipe-data', {});
  },
};
