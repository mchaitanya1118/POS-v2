import { Controller, Get, Post, Delete, Body, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class PosController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // SETTINGS
  // ==========================================
  @Get('settings')
  async getSettings(@TenantId() tenantId: string) {
    const settingsList = await this.prisma.settings.findMany({
      where: { tenant_id: tenantId },
    });

    const settingsObj: Record<string, any> = {};
    settingsList.forEach((row) => {
      if (row.key === 'taxPercentage') {
        settingsObj[row.key] = parseFloat(row.value);
      } else if (row.key === 'enableGst') {
        settingsObj[row.key] = row.value === 'true';
      } else {
        settingsObj[row.key] = row.value;
      }
    });

    return settingsObj;
  }

  @Post('settings')
  async saveSettings(@TenantId() tenantId: string, @Body() settings: Record<string, any>) {
    const rows = Object.entries(settings).map(([key, value]) => ({
      tenant_id: tenantId,
      key,
      value: String(value),
      updated_at: new Date(),
    }));

    for (const row of rows) {
      await this.prisma.settings.upsert({
        where: {
          tenant_id_key: {
            tenant_id: tenantId,
            key: row.key,
          },
        },
        update: { value: row.value, updated_at: row.updated_at },
        create: row,
      });
    }
    return { success: true };
  }

  // ==========================================
  // TABLES
  // ==========================================
  @Get('tables')
  async getTables(@TenantId() tenantId: string) {
    return this.prisma.tables.findMany({
      where: { tenant_id: tenantId },
      orderBy: { table_number: 'asc' },
    });
  }

  @Post('tables')
  async saveTable(@TenantId() tenantId: string, @Body() table: any) {
    return this.prisma.tables.upsert({
      where: { id: table.id },
      update: {
        table_number: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        updated_at: new Date(),
      },
      create: {
        id: table.id,
        tenant_id: tenantId,
        table_number: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
      },
    });
  }

  @Delete('tables/:id')
  async deleteTable(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.tables.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  @Get('categories')
  async getCategories(@TenantId() tenantId: string) {
    return this.prisma.menu_categories.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('categories')
  async saveCategory(@TenantId() tenantId: string, @Body() category: any) {
    return this.prisma.menu_categories.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        slug: category.slug,
        updated_at: new Date(),
      },
      create: {
        id: category.id,
        tenant_id: tenantId,
        name: category.name,
        slug: category.slug,
      },
    });
  }

  @Delete('categories/:id')
  async deleteCategory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.menu_categories.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // MENU ITEMS
  // ==========================================
  @Get('menu-items')
  async getMenuItems(@TenantId() tenantId: string) {
    return this.prisma.menu_items.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('menu-items')
  async saveMenuItem(@TenantId() tenantId: string, @Body() item: any) {
    return this.prisma.menu_items.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category_id: item.categoryId,
        description: item.description,
        price: parseFloat(item.price),
        image_url: item.imageUrl,
        is_available: item.isAvailable,
        updated_at: new Date(),
      },
      create: {
        id: item.id,
        tenant_id: tenantId,
        name: item.name,
        category_id: item.categoryId,
        description: item.description,
        price: parseFloat(item.price),
        image_url: item.imageUrl,
        is_available: item.isAvailable,
      },
    });
  }

  @Delete('menu-items/:id')
  async deleteMenuItem(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.menu_items.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  @Get('customers')
  async getCustomers(@TenantId() tenantId: string) {
    return this.prisma.customers.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('customers')
  async saveCustomer(@TenantId() tenantId: string, @Body() customer: any) {
    return this.prisma.customers.upsert({
      where: { id: customer.id },
      update: {
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        notes: customer.notes,
        updated_at: new Date(),
      },
      create: {
        id: customer.id,
        tenant_id: tenantId,
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        notes: customer.notes,
      },
    });
  }

  @Delete('customers/:id')
  async deleteCustomer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.customers.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // CUSTOMER LEDGER
  // ==========================================
  @Get('customers/ledger')
  async getCustomerLedger(@TenantId() tenantId: string) {
    return this.prisma.customer_ledger.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('customers/ledger')
  async saveLedgerEntry(@TenantId() tenantId: string, @Body() entry: any) {
    return this.prisma.customer_ledger.create({
      data: {
        id: entry.id,
        tenant_id: tenantId,
        customer_id: entry.customerId,
        transaction_type: entry.transactionType,
        amount: parseFloat(entry.amount),
        balance: parseFloat(entry.balance),
        transaction_date: entry.transactionDate,
        notes: entry.notes,
      },
    });
  }

  // ==========================================
  // ORDERS
  // ==========================================
  @Get('orders')
  async getOrders(@TenantId() tenantId: string) {
    return this.prisma.orders.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Get('orders/items')
  async getOrderItems(@TenantId() tenantId: string) {
    return this.prisma.order_items.findMany({
      where: { tenant_id: tenantId },
    });
  }

  @Post('orders')
  async saveOrder(@TenantId() tenantId: string, @Body() body: any) {
    const { order, items } = body;

    // Use a transaction to save the order and its items atomically
    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert the order
      await tx.orders.upsert({
        where: { id: order.id },
        update: {
          order_number: order.orderNumber,
          table_id: order.tableId,
          customer_id: order.customerId,
          subtotal: parseFloat(order.subtotal),
          tax: parseFloat(order.tax),
          discount: parseFloat(order.discount),
          grand_total: parseFloat(order.grandTotal),
          status: order.status,
          payment_status: order.paymentStatus,
          updated_at: new Date(),
        },
        create: {
          id: order.id,
          tenant_id: tenantId,
          order_number: order.orderNumber,
          table_id: order.tableId,
          customer_id: order.customerId,
          subtotal: parseFloat(order.subtotal),
          tax: parseFloat(order.tax),
          discount: parseFloat(order.discount),
          grand_total: parseFloat(order.grandTotal),
          status: order.status,
          payment_status: order.paymentStatus,
        },
      });

      // 2. Delete existing items for the order
      await tx.order_items.deleteMany({
        where: { order_id: order.id, tenant_id: tenantId },
      });

      // 3. Insert new items
      if (items && items.length > 0) {
        const rows = items.map((item: any) => ({
          id: item.id,
          tenant_id: tenantId,
          order_id: item.orderId,
          menu_item_id: item.menuItemId,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal),
        }));

        await tx.order_items.createMany({
          data: rows,
        });
      }
    });
  }

  // ==========================================
  // PAYMENTS
  // ==========================================
  @Get('payments')
  async getPayments(@TenantId() tenantId: string) {
    return this.prisma.payments.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('payments')
  async savePayment(@TenantId() tenantId: string, @Body() payment: any) {
    return this.prisma.payments.create({
      data: {
        id: payment.id,
        tenant_id: tenantId,
        order_id: payment.orderId,
        payment_type: payment.paymentType,
        amount_paid: parseFloat(payment.amountPaid),
        payment_method: payment.paymentMethod,
        details: payment.details,
      },
    });
  }

  // ==========================================
  // PENDING PAYMENTS
  // ==========================================
  @Get('pending-payments')
  async getPendingPayments(@TenantId() tenantId: string) {
    return this.prisma.pending_payments.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('pending-payments')
  async savePendingPayment(@TenantId() tenantId: string, @Body() pp: any) {
    return this.prisma.pending_payments.upsert({
      where: { id: pp.id },
      update: {
        order_id: pp.orderId,
        customer_id: pp.customerId,
        amount_due: parseFloat(pp.amountDue),
        due_date: pp.dueDate,
        status: pp.status,
        notes: pp.notes,
        updated_at: new Date(),
      },
      create: {
        id: pp.id,
        tenant_id: tenantId,
        order_id: pp.orderId,
        customer_id: pp.customerId,
        amount_due: parseFloat(pp.amountDue),
        due_date: pp.dueDate,
        status: pp.status,
        notes: pp.notes,
      },
    });
  }

  @Delete('pending-payments/:id')
  async deletePendingPayment(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.pending_payments.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // EXPENSES
  // ==========================================
  @Get('expenses')
  async getExpenses(@TenantId() tenantId: string) {
    return this.prisma.expenses.findMany({
      where: { tenant_id: tenantId },
      orderBy: { date: 'desc' },
    });
  }

  @Post('expenses')
  async saveExpense(@TenantId() tenantId: string, @Body() expense: any) {
    return this.prisma.expenses.upsert({
      where: { id: expense.id },
      update: {
        date: expense.date,
        category_id: expense.categoryId,
        description: expense.description,
        amount: parseFloat(expense.amount),
        payment_method: expense.paymentMethod,
        updated_at: new Date(),
      },
      create: {
        id: expense.id,
        tenant_id: tenantId,
        date: expense.date,
        category_id: expense.categoryId,
        description: expense.description,
        amount: parseFloat(expense.amount),
        payment_method: expense.paymentMethod,
      },
    });
  }

  @Delete('expenses/:id')
  async deleteExpense(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.expenses.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  @Get('expense-categories')
  async getExpenseCategories(@TenantId() tenantId: string) {
    return this.prisma.expense_categories.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  // ==========================================
  // KITCHEN TICKETS
  // ==========================================
  @Get('kitchen-tickets')
  async getKitchenTickets(@TenantId() tenantId: string) {
    return this.prisma.kitchen_tickets.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    });
  }

  @Post('kitchen-tickets')
  async saveKitchenTicket(@TenantId() tenantId: string, @Body() ticket: any) {
    return this.prisma.kitchen_tickets.upsert({
      where: { id: ticket.id },
      update: {
        order_id: ticket.orderId,
        table_id: ticket.tableId,
        status: ticket.status,
        updated_at: new Date(),
      },
      create: {
        id: ticket.id,
        tenant_id: tenantId,
        order_id: ticket.orderId,
        table_id: ticket.tableId,
        status: ticket.status,
      },
    });
  }

  @Delete('kitchen-tickets/:id')
  async deleteKitchenTicket(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.kitchen_tickets.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  @Get('audit-logs')
  async getAuditLogs(@TenantId() tenantId: string) {
    return this.prisma.audit_logs.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('audit-logs')
  async saveAuditLog(@TenantId() tenantId: string, @Body() log: any) {
    return this.prisma.audit_logs.create({
      data: {
        id: log.id,
        tenant_id: tenantId,
        operator: log.operator,
        action: log.action,
        old_value: log.oldValue,
        new_value: log.newValue,
        details: log.details,
      },
    });
  }

  // ==========================================
  // USERS
  // ==========================================
  @Get('users')
  async getUsers(@TenantId() tenantId: string) {
    return this.prisma.users.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    });
  }

  @Post('users')
  async saveUser(@TenantId() tenantId: string, @Body() user: any) {
    return this.prisma.users.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        passcode: user.passcode,
        role: user.role,
        updated_at: new Date(),
      },
      create: {
        id: user.id,
        tenant_id: tenantId,
        name: user.name,
        passcode: user.passcode,
        role: user.role,
      },
    });
  }

  @Delete('users/:id')
  async deleteUser(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.users.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // STAFF TRANSACTIONS
  // ==========================================
  @Get('staff-transactions')
  async getStaffTransactions(@TenantId() tenantId: string) {
    return this.prisma.staff_transactions.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('staff-transactions')
  async saveStaffTransaction(@TenantId() tenantId: string, @Body() tx: any) {
    return this.prisma.staff_transactions.upsert({
      where: { id: tx.id },
      update: {
        user_id: tx.userId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        date: tx.date,
        payment_method: tx.paymentMethod,
        notes: tx.notes,
        updated_at: new Date(),
      },
      create: {
        id: tx.id,
        tenant_id: tenantId,
        user_id: tx.userId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        date: tx.date,
        payment_method: tx.paymentMethod,
        notes: tx.notes,
      },
    });
  }

  @Delete('staff-transactions/:id')
  async deleteStaffTransaction(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.staff_transactions.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // SUBSCRIPTIONS & FEATURE FLAGS
  // ==========================================
  @Get('subscription')
  async getSubscription(@TenantId() tenantId: string) {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return { plan: 'free', is_active: false, features: {} };
    }
    return {
      plan: tenant.plan,
      is_active: tenant.is_active,
      billing_cycle: tenant.billing_cycle,
      subscription_status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at,
      features: tenant.features || {},
    };
  }

  @Post('subscription')
  async updateSubscription(
    @TenantId() tenantId: string,
    @Body() body: { plan: string; billingCycle?: string },
  ) {
    const { plan, billingCycle } = body;

    const featureMap: Record<string, Record<string, boolean>> = {
      free: { voice_ai: false, reservations: false, inventory: false, loyalty: false, analytics: false, delivery: false, whatsapp: false },
      starter: { voice_ai: false, reservations: true, inventory: false, loyalty: false, analytics: true, delivery: false, whatsapp: false },
      professional: { voice_ai: false, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: false },
      enterprise: { voice_ai: true, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: true },
    };

    const features = featureMap[plan] || featureMap.free;

    await this.prisma.tenants.upsert({
      where: { id: tenantId },
      update: {
        plan,
        billing_cycle: billingCycle || 'monthly',
        subscription_status: 'active',
        features,
        updated_at: new Date(),
      },
      create: {
        id: tenantId,
        name: 'My Restaurant',
        plan,
        billing_cycle: billingCycle || 'monthly',
        subscription_status: 'active',
        features,
      },
    });

    return { success: true, plan, features };
  }

  @Get('features')
  async getFeatures(@TenantId() tenantId: string) {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { features: true },
    });
    return tenant?.features || {
      voice_ai: false,
      reservations: false,
      inventory: false,
      loyalty: false,
      analytics: false,
      delivery: false,
      whatsapp: false,
    };
  }

  // ==========================================
  // SYSTEM LIFE UTILITIES
  // ==========================================
  @Post('wipe-data')
  async wipeTransactionData(@TenantId() tenantId: string) {
    const tablesToWipe = [
      'order_items', 'payments', 'pending_payments',
      'kitchen_tickets', 'orders', 'customer_ledger',
      'expenses', 'staff_transactions', 'audit_logs'
    ];

    for (const tableName of tablesToWipe) {
      await (this.prisma as any)[tableName].deleteMany({
        where: { tenant_id: tenantId },
      });
    }

    // Reset table status to available
    await this.prisma.tables.updateMany({
      where: { tenant_id: tenantId },
      data: {
        status: 'available',
      },
    });

    return { success: true };
  }
}
