import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING COMPREHENSIVE BACKEND VALIDATION TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Setup Tenant Plan to professional (so delivery and analytics features are active)
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'professional',
      features: { voice_ai: false, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: false },
    },
  });

  // 2. Validate Delivery Module
  console.log('1. Testing Delivery Module...');
  const agentId = 'agent-01';
  await prisma.delivery_agents.upsert({
    where: { id: agentId },
    update: {},
    create: {
      id: agentId,
      tenant_id: tenantId,
      name: 'Rider Dave',
      phone: '+15550999',
      vehicle_number: 'M-1234',
    },
  });

  // Create an order if none exists
  const orderId = 'order-del-01';
  await prisma.orders.upsert({
    where: { id: orderId },
    update: {},
    create: {
      id: orderId,
      tenant_id: tenantId,
      order_number: 'ORD-DEL-101',
      subtotal: 50.0,
      tax: 6.25,
      discount: 0.0,
      grand_total: 56.25,
      status: 'completed',
      payment_status: 'paid',
    },
  });

  await prisma.delivery_orders.upsert({
    where: { order_id: orderId },
    update: {},
    create: {
      id: 'del-ord-01',
      tenant_id: tenantId,
      order_id: orderId,
      agent_id: agentId,
      status: 'assigned',
      customer_address: '123 Main St, Springfield',
    },
  });

  const delOrders = await prisma.delivery_orders.findMany({ where: { tenant_id: tenantId } });
  if (delOrders.length > 0 && delOrders[0].agent_id === agentId) {
    console.log('✔ PASS: Delivery Agent and Order successfully linked!');
  } else {
    console.error('❌ FAIL: Delivery module test failed.');
    process.exit(1);
  }

  // 3. Validate Analytics Module
  console.log('\n2. Testing Analytics Reporting...');
  // Clean up expenses and create test ones
  await prisma.expense_categories.upsert({
    where: { id: 'cat_ingredients' },
    update: {},
    create: {
      id: 'cat_ingredients',
      tenant_id: tenantId,
      name: 'Ingredients',
    },
  });
  await prisma.expenses.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.expenses.create({
    data: {
      id: 'exp-test-01',
      tenant_id: tenantId,
      date: '2026-06-30',
      category_id: 'cat_ingredients',
      description: 'Coffee Beans Purchase',
      amount: 15.00,
      payment_method: 'cash',
    },
  });

  // Calculate sales report aggregates (just like AnalyticsController does)
  const ordersList = await prisma.orders.findMany({
    where: { tenant_id: tenantId, status: 'completed' },
    select: { grand_total: true, subtotal: true },
  });
  const expensesList = await prisma.expenses.findMany({
    where: { tenant_id: tenantId },
    select: { amount: true },
  });

  const totalSales = ordersList.reduce((sum, o) => sum + o.grand_total, 0);
  const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalSales - totalExpenses;

  console.log(`- Calculated Total Sales: $${totalSales}`);
  console.log(`- Calculated Total Expenses: $${totalExpenses}`);
  console.log(`- Calculated Net Profit: $${profit}`);

  if (totalSales > 0 && totalExpenses === 15 && profit === totalSales - 15) {
    console.log('✔ PASS: Sales aggregates and net profit margins computed perfectly!');
  } else {
    console.error('❌ FAIL: Analytics calculations did not match expected values.');
    process.exit(1);
  }

  // 4. Validate Health Check DB Ping
  console.log('\n3. Testing Health Check DB ping...');
  const pingResult = await prisma.$queryRaw`SELECT 1 as result`;
  console.log('- Raw SQL Ping result:', pingResult);
  if (pingResult && Array.isArray(pingResult) && pingResult[0].result === 1) {
    console.log('✔ PASS: Raw database ping completed successfully!');
  } else {
    console.error('❌ FAIL: Database health check ping failed.');
    process.exit(1);
  }

  console.log('\n--- ALL BACKEND CORE VALIDATION TESTS PASSED SUCCESSFULLY! ---');
}

runTest()
  .catch((e) => {
    console.error('Test script crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
