import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany();
  console.log("=== USERS ===");
  console.dir(users, { depth: null });
  await prisma.$disconnect();
}

main().catch(console.error);
