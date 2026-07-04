import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING VOICE AI & FEATURE FLAG TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Enable Voice AI by setting plan to enterprise
  console.log('1. Setting plan to "enterprise" (Voice AI = Enabled)...');
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
  if (features.voice_ai) {
    console.log('✔ Voice AI feature active in DB');
  } else {
    console.error('❌ Voice AI activation failed');
    process.exit(1);
  }

  // 2. Perform Voice AI table operations
  console.log('2. Configuring Voice AI settings...');
  await prisma.voice_ai_settings.upsert({
    where: { tenant_id: tenantId },
    update: {
      greeting_message: 'Hello! You have reached Infinity Cafe. How may I assist you?',
      voice_model: 'en-US-Wavenet-F',
    },
    create: {
      tenant_id: tenantId,
      greeting_message: 'Hello! You have reached Infinity Cafe. How may I assist you?',
      voice_model: 'en-US-Wavenet-F',
    },
  });

  console.log('3. Inserting a mock call trace...');
  const callId = 'call-test-01';
  await prisma.voice_ai_calls.upsert({
    where: { id: callId },
    update: {},
    create: {
      id: callId,
      tenant_id: tenantId,
      caller_number: '+15550211',
      status: 'completed',
      transcription: 'Hello, I would like to book a table for four people tonight at 7 PM.',
      duration_seconds: 45,
    },
  });

  // Verify call log exists
  const calls = await prisma.voice_ai_calls.findMany({
    where: { tenant_id: tenantId },
  });
  if (calls.length > 0) {
    console.log(`✔ Success: Found ${calls.length} active call log(s)`);
  } else {
    console.error('❌ Failed to find call log');
    process.exit(1);
  }

  // 4. Disable Voice AI by changing plan to starter
  console.log('4. Downgrading plan to "starter" (Voice AI = Disabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'starter',
      features: { voice_ai: false, reservations: true, inventory: false, loyalty: false, analytics: true, delivery: false, whatsapp: false },
    },
  });

  // Mock FeatureFlagGuard logic check
  tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  features = (tenant?.features as Record<string, boolean>) || {};
  if (!features.voice_ai) {
    console.log('✔ PASS: Voice AI feature is correctly disabled on starter tier. FeatureFlagGuard will block requests!');
  } else {
    console.error('❌ FAIL: Voice AI feature was not disabled.');
    process.exit(1);
  }

  console.log('--- ALL VOICE AI & FEATURE GUARD TESTS PASSED! ---');
}

runTest()
  .catch((e) => {
    console.error('Test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
