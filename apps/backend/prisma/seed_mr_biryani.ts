import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING MR BIRYANI MENU ===");
  
  // 1. Get all active tenants
  const tenants = await prisma.tenants.findMany();
  if (tenants.length === 0) {
    console.log("No tenants found in database. Exiting.");
    return;
  }
  
  console.log(`Found ${tenants.length} tenants in the database:`, tenants.map(t => t.name));

  // 2. Read the scraped JSON file
  const jsonPath = path.join(__dirname, 'mr_biryani_menu.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Scraped JSON not found at: ${jsonPath}`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const response = JSON.parse(rawData);

  if (!response.data || !response.data.categories) {
    console.error("Invalid JSON format in scraped menu data.");
    return;
  }

  const scrapedCategories = response.data.categories;
  console.log(`Loaded ${scrapedCategories.length} categories from scraped file.`);

  // 3. Populate each tenant's catalog
  for (const tenant of tenants) {
    console.log(`\n--- Seeding Tenant: '${tenant.name}' (${tenant.id}) ---`);
    
    let categoriesAdded = 0;
    let itemsAdded = 0;

    for (const cat of scrapedCategories) {
      if (!cat.isActive) continue;
      
      const products = cat.products || [];
      if (products.length === 0) continue; // Skip empty categories

      // Generate a clean category ID and slug
      const catSlug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const catId = `cat_${tenant.id.substring(0, 5)}_${catSlug.substring(0, 20)}`;

      await prisma.menu_categories.upsert({
        where: { id: catId },
        update: {
          name: cat.name,
          slug: catSlug,
        },
        create: {
          id: catId,
          tenant_id: tenant.id,
          name: cat.name,
          slug: catSlug,
        }
      });
      categoriesAdded++;

      // Seed products under this category
      for (const prod of products) {
        if (!prod.isActive) continue;

        const prodSlug = prod.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const prodId = `item_${tenant.id.substring(0, 5)}_${prodSlug.substring(0, 30)}`;

        const cleanDesc = prod.description 
          ? prod.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() 
          : '';

        await prisma.menu_items.upsert({
          where: { id: prodId },
          update: {
            name: prod.name,
            price: prod.displayPrice || 0,
            description: cleanDesc,
            image_url: prod.image || null,
          },
          create: {
            id: prodId,
            tenant_id: tenant.id,
            category_id: catId,
            name: prod.name,
            price: prod.displayPrice || 0,
            description: cleanDesc,
            image_url: prod.image || null,
            is_available: true,
          }
        });
        itemsAdded++;
      }
    }

    console.log(`Tenant '${tenant.name}': Seeded ${categoriesAdded} categories and ${itemsAdded} menu items.`);
  }

  await prisma.$disconnect();
  console.log("\n=== SEEDING COMPLETED SUCCESSFULLY ===");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
