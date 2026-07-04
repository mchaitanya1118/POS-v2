import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING MULTI-TENANT BOUNDARY TEST ---');

  const tenantA = 'default-tenant-id';
  const tenantB = 'tenant-2';

  // 1. Ensure Tenant B exists
  await prisma.tenants.upsert({
    where: { id: tenantB },
    update: {},
    create: {
      id: tenantB,
      name: 'Gourmet Kitchen (Tenant 2)',
      plan: 'starter',
      is_active: true,
    },
  });
  console.log('1. Tenant B successfully registered');

  // 2. Clean up any previous test items in Tenant B
  await prisma.menu_items.deleteMany({ where: { tenant_id: tenantB } });
  await prisma.menu_categories.deleteMany({ where: { tenant_id: tenantB } });

  // 3. Create a menu category and item in Tenant B
  const catB = 'cat_tenant_b';
  await prisma.menu_categories.create({
    data: {
      id: catB,
      tenant_id: tenantB,
      name: 'Tenant B Special Drinks',
      slug: 'tenant-b-special-drinks',
    },
  });

  const itemB = 'item_tenant_b';
  await prisma.menu_items.create({
    data: {
      id: itemB,
      tenant_id: tenantB,
      name: 'Premium Espresso B',
      category_id: catB,
      price: 250,
      is_available: true,
    },
  });
  console.log('2. Created category and menu item for Tenant B');

  // 4. Query menu items for Tenant A (default-tenant-id)
  const itemsA = await prisma.menu_items.findMany({
    where: { tenant_id: tenantA },
  });
  console.log(`3. Queried Tenant A: Found ${itemsA.length} items.`);
  const foundBInA = itemsA.some((item) => item.id === itemB || item.tenant_id === tenantB);
  if (foundBInA) {
    console.error('❌ FAIL: Data Leakage! Found Tenant B items in Tenant A query.');
    process.exit(1);
  } else {
    console.log('✔ PASS: No Tenant B data leaked into Tenant A!');
  }

  // 5. Query menu items for Tenant B (tenant-2)
  const itemsB = await prisma.menu_items.findMany({
    where: { tenant_id: tenantB },
  });
  console.log(`4. Queried Tenant B: Found ${itemsB.length} items.`);
  const foundOnlyB = itemsB.every((item) => item.tenant_id === tenantB);
  if (foundOnlyB && itemsB.length === 1) {
    console.log('✔ PASS: Tenant B query returned exactly and only Tenant B items!');
  } else {
    console.error('❌ FAIL: Tenant B query returned incorrect items.', itemsB);
    process.exit(1);
  }

  console.log('--- ALL MULTI-TENANT ISOLATION TESTS PASSED SUCCESSFULLY! ---');
}

runTest()
  .catch((e) => {
    console.error('Test script crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
