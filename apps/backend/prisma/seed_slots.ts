import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING TIME SLOTS FOR TENANTS ===");
  const tenants = await prisma.tenants.findMany();
  
  for (const tenant of tenants) {
    const existingSlots = await prisma.time_slots.findMany({
      where: { tenant_id: tenant.id }
    });

    if (existingSlots.length === 0) {
      console.log(`Tenant '${tenant.name}' (${tenant.id}) has no time slots. Seeding defaults...`);
      await prisma.time_slots.createMany({
        data: [
          {
            id: `slot-lunch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            tenant_id: tenant.id,
            start_time: '12:00',
            end_time: '15:00',
            max_covers: 30
          },
          {
            id: `slot-dinner-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            tenant_id: tenant.id,
            start_time: '19:00',
            end_time: '22:30',
            max_covers: 50
          }
        ]
      });
      console.log(`Successfully seeded default time slots for tenant: ${tenant.id}`);
    } else {
      console.log(`Tenant '${tenant.name}' (${tenant.id}) already has ${existingSlots.length} time slots.`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
