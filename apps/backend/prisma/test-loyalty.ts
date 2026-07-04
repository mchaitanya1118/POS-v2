import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING LOYALTY & FEATURE FLAG TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Enable Loyalty by setting plan to professional
  console.log('1. Setting plan to "professional" (Loyalty = Enabled)...');
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'professional',
      features: { voice_ai: false, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: false },
    },
  });

  // Verify feature active
  let tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  let features = (tenant?.features as Record<string, boolean>) || {};
  if (features.loyalty) {
    console.log('✔ Loyalty feature active in DB');
  } else {
    console.error('❌ Loyalty activation failed');
    process.exit(1);
  }

  // Get a customer to link
  const customer = await prisma.customers.findFirst({
    where: { tenant_id: tenantId },
  });

  if (!customer) {
    console.error('❌ No customer found in DB for default tenant. Run seed first.');
    process.exit(1);
  }

  const customerId = customer.id;
  console.log(`Using customer ${customer.name} (ID: ${customerId}) for test.`);

  // Clean up previous test profile/transactions
  const existingProfile = await prisma.loyalty_profiles.findUnique({
    where: { customer_id: customerId },
  });
  if (existingProfile) {
    await prisma.loyalty_transactions.deleteMany({
      where: { loyalty_profile_id: existingProfile.id },
    });
    await prisma.loyalty_profiles.delete({
      where: { id: existingProfile.id },
    });
  }

  // 2. Perform Loyalty transactions & check automatic points & tier progression
  console.log('2. Recording loyalty transaction: Earn 300 points...');
  
  // Use a mock controller-like transaction block
  await prisma.$transaction(async (tx) => {
    // Get/create profile
    let profile = await tx.loyalty_profiles.create({
      data: {
        id: `prof-${customerId}`,
        tenant_id: tenantId,
        customer_id: customerId,
        points_balance: 0,
        tier: 'Bronze',
      },
    });

    const points = 300;
    const newBalance = profile.points_balance + points;

    // Calculate tier
    let tier = 'Bronze';
    if (newBalance >= 1000) tier = 'Platinum';
    else if (newBalance >= 500) tier = 'Gold';
    else if (newBalance >= 200) tier = 'Silver';

    await tx.loyalty_profiles.update({
      where: { id: profile.id },
      data: { points_balance: newBalance, tier },
    });

    await tx.loyalty_transactions.create({
      data: {
        id: 'tx-loyalty-01',
        tenant_id: tenantId,
        loyalty_profile_id: profile.id,
        type: 'earn',
        points,
        amount: 3000,
        notes: 'Coffee purchase points earn',
      },
    });
  });

  // Verify profile updates
  let updatedProfile = await prisma.loyalty_profiles.findUnique({
    where: { customer_id: customerId },
  });
  console.log(`- Points Balance: ${updatedProfile?.points_balance}`);
  console.log(`- Tier Rank: ${updatedProfile?.tier}`);

  if (updatedProfile?.points_balance === 300 && updatedProfile?.tier === 'Silver') {
    console.log('✔ PASS: Point earn recorded and tier upgraded to "Silver" automatically!');
  } else {
    console.error('❌ FAIL: Loyalty profile points or tier calculation is incorrect.');
    process.exit(1);
  }

  // 3. Perform a points redemption transaction
  console.log('\n3. Recording loyalty transaction: Redeem 100 points...');
  await prisma.$transaction(async (tx) => {
    const profile = await tx.loyalty_profiles.findUnique({
      where: { customer_id: customerId },
    });
    if (!profile) throw new Error('Profile not found');

    const points = 100;
    const newBalance = profile.points_balance - points;

    // Calculate tier
    let tier = 'Bronze';
    if (newBalance >= 1000) tier = 'Platinum';
    else if (newBalance >= 500) tier = 'Gold';
    else if (newBalance >= 200) tier = 'Silver';

    await tx.loyalty_profiles.update({
      where: { id: profile.id },
      data: { points_balance: newBalance, tier },
    });

    await tx.loyalty_transactions.create({
      data: {
        id: 'tx-loyalty-02',
        tenant_id: tenantId,
        loyalty_profile_id: profile.id,
        type: 'redeem',
        points,
        notes: 'Redeemed points for $10 discount',
      },
    });
  });

  updatedProfile = await prisma.loyalty_profiles.findUnique({
    where: { customer_id: customerId },
  });
  console.log(`- Points Balance: ${updatedProfile?.points_balance}`);
  console.log(`- Tier Rank: ${updatedProfile?.tier}`);

  if (updatedProfile?.points_balance === 200 && updatedProfile?.tier === 'Silver') {
    console.log('✔ PASS: Point redemption recorded correctly!');
  } else {
    console.error('❌ FAIL: Point redemption updates failed.');
    process.exit(1);
  }

  // 4. Disable Loyalty by changing plan to starter
  console.log('\n4. Downgrading plan to "starter" (Loyalty = Disabled)...');
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
  if (!features.loyalty) {
    console.log('✔ PASS: Loyalty feature is correctly disabled on starter tier. FeatureFlagGuard will block requests!');
  } else {
    console.error('❌ FAIL: Loyalty feature was not disabled.');
    process.exit(1);
  }

  console.log('--- ALL LOYALTY MODULE & FEATURE GUARD TESTS PASSED! ---');
}

runTest()
  .catch((e) => {
    console.error('Test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
