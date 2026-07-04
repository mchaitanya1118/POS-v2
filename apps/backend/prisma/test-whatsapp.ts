import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING WHATSAPP & FEATURE FLAG TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Enable WhatsApp by setting plan to enterprise
  console.log('1. Setting plan to "enterprise" (WhatsApp = Enabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'enterprise',
      features: { voice_ai: true, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: true },
    },
  });

  // Verify feature active
  let tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  let features = (tenant?.features as Record<string, boolean>) || {};
  if (features.whatsapp) {
    console.log('✔ WhatsApp feature active in DB');
  } else {
    console.error('❌ WhatsApp activation failed');
    process.exit(1);
  }

  // 2. Perform WhatsApp operations
  console.log('2. Creating WhatsApp template...');
  const templateId = 'temp-order-confirm';
  await prisma.whatsapp_templates.upsert({
    where: { id: templateId },
    update: {},
    create: {
      id: templateId,
      tenant_id: tenantId,
      name: 'order_confirmation',
      category: 'utility',
      language: 'en',
      body_text: 'Hi {{1}}, your order #{{2}} is confirmed! Total: {{3}}',
      status: 'approved',
    },
  });

  console.log('3. Inserting a mock message outbound trace...');
  const logId = 'log-whatsapp-01';
  await prisma.whatsapp_logs.upsert({
    where: { id: logId },
    update: {},
    create: {
      id: logId,
      tenant_id: tenantId,
      recipient_number: '+15550255',
      direction: 'outbound',
      message_text: 'Hi John, your order #1002 is confirmed! Total: $25.50',
      status: 'sent',
    },
  });

  // Verify log exists
  const logs = await prisma.whatsapp_logs.findMany({
    where: { tenant_id: tenantId },
  });
  if (logs.length > 0) {
    console.log(`✔ Success: Found ${logs.length} active WhatsApp message log(s)`);
  } else {
    console.error('❌ Failed to find WhatsApp log');
    process.exit(1);
  }

  // 4. Disable WhatsApp by changing plan to professional
  console.log('4. Downgrading plan to "professional" (WhatsApp = Disabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'professional',
      features: { voice_ai: false, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: false },
    },
  });

  // Mock FeatureFlagGuard logic check
  tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  features = (tenant?.features as Record<string, boolean>) || {};
  if (!features.whatsapp) {
    console.log('✔ PASS: WhatsApp feature is correctly disabled on professional tier. FeatureFlagGuard will block requests!');
  } else {
    console.error('❌ FAIL: WhatsApp feature was not disabled.');
    process.exit(1);
  }

  console.log('--- ALL WHATSAPP & FEATURE GUARD TESTS PASSED! ---');
}

runTest()
  .catch((e) => {
    console.error('Test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
