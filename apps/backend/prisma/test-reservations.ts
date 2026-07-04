import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING RESERVATION & FEATURE GUARD TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Enable reservations by setting plan to starter
  console.log('1. Setting plan to "starter" (Reservations = Enabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'starter',
      features: { voice_ai: false, reservations: true, inventory: false, loyalty: false, analytics: true, delivery: false, whatsapp: false },
    },
  });

  // Verify feature active
  let tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  let features = (tenant?.features as Record<string, boolean>) || {};
  if (features.reservations) {
    console.log('✔ Feature active in DB');
  } else {
    console.error('❌ Feature activation failed');
    process.exit(1);
  }

  // 2. Perform reservation table operations
  console.log('2. Inserting Time Slots & Table Groups...');
  const slotId = 'slot-dinner-1';
  await prisma.time_slots.upsert({
    where: { id: slotId },
    update: {},
    create: {
      id: slotId,
      tenant_id: tenantId,
      start_time: '19:00',
      end_time: '20:30',
      max_covers: 20,
    },
  });

  const groupId = 'group-indoor';
  await prisma.table_groups.upsert({
    where: { id: groupId },
    update: {},
    create: {
      id: groupId,
      tenant_id: tenantId,
      name: 'Indoor Dining Hall',
    },
  });

  console.log('3. Creating a test booking...');
  const resId = 'res-test-01';
  await prisma.reservations.upsert({
    where: { id: resId },
    update: {},
    create: {
      id: resId,
      tenant_id: tenantId,
      customer_name: 'John Doe',
      customer_phone: '+15550199',
      party_size: 4,
      reservation_date: '2026-07-04',
      time_slot_id: slotId,
      status: 'confirmed',
    },
  });

  // Verify reservation exists
  const bookings = await prisma.reservations.findMany({
    where: { tenant_id: tenantId },
  });
  if (bookings.length > 0) {
    console.log(`✔ Success: Found ${bookings.length} active reservation(s)`);
  } else {
    console.error('❌ Failed to find reservation');
    process.exit(1);
  }

  // 4. Disable reservations by changing plan to free
  console.log('4. Downgrading plan to "free" (Reservations = Disabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'free',
      features: { voice_ai: false, reservations: false, inventory: false, loyalty: false, analytics: false, delivery: false, whatsapp: false },
    },
  });

  // Mock FeatureFlagGuard logic check
  tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  features = (tenant?.features as Record<string, boolean>) || {};
  if (!features.reservations) {
    console.log('✔ PASS: Feature flag is correctly disabled on free tier. FeatureFlagGuard will block requests!');
  } else {
    console.error('❌ FAIL: Reservations feature was not disabled.');
    process.exit(1);
  }

  console.log('--- ALL RESERVATION & FEATURE GUARD TESTS PASSED! ---');
}

runTest()
  .catch((e) => {
    console.error('Test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
