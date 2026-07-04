import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING SUBSCRIPTION & FEATURE FLAG SYSTEM TEST ---');

  const tenantId = 'default-tenant-id';

  // 1. Set subscription to professional
  console.log('1. Setting subscription plan to "professional"...');
  
  const featureMap: Record<string, Record<string, boolean>> = {
    free: { voice_ai: false, reservations: false, inventory: false, loyalty: false, analytics: false, delivery: false, whatsapp: false },
    starter: { voice_ai: false, reservations: true, inventory: false, loyalty: false, analytics: true, delivery: false, whatsapp: false },
    professional: { voice_ai: false, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: false },
    enterprise: { voice_ai: true, reservations: true, inventory: true, loyalty: true, analytics: true, delivery: true, whatsapp: true },
  };

  const profFeatures = featureMap.professional;
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'professional',
      features: profFeatures,
    },
  });

  // Verify features in database
  let tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  let features = (tenant?.features as Record<string, boolean>) || {};
  console.log(`- Database plan: ${tenant?.plan}`);
  console.log(`- voice_ai active: ${features.voice_ai}`);
  console.log(`- inventory active: ${features.inventory}`);

  if (tenant?.plan === 'professional' && !features.voice_ai && features.inventory) {
    console.log('✔ PASS: Professional plan successfully activated with correct feature flags.');
  } else {
    console.error('❌ FAIL: Incorrect plan/feature configuration for Professional.');
    process.exit(1);
  }

  // 2. Upgrade to enterprise
  console.log('\n2. Upgrading subscription plan to "enterprise"...');
  const entFeatures = featureMap.enterprise;
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      plan: 'enterprise',
      features: entFeatures,
    },
  });

  // Verify features in database
  tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  features = (tenant?.features as Record<string, boolean>) || {};
  console.log(`- Database plan: ${tenant?.plan}`);
  console.log(`- voice_ai active: ${features.voice_ai}`);
  console.log(`- whatsapp active: ${features.whatsapp}`);

  if (tenant?.plan === 'enterprise' && features.voice_ai && features.whatsapp) {
    console.log('✔ PASS: Enterprise plan successfully activated with Voice AI and WhatsApp enabled.');
  } else {
    console.error('❌ FAIL: Incorrect plan/feature configuration for Enterprise.');
    process.exit(1);
  }

  console.log('\n--- ALL SUBSCRIPTION & FEATURE FLAG SYSTEM TESTS PASSED! ---');
}

runTest()
  .catch((e) => {
    console.error('Test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
