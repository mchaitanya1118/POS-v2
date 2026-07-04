import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding multi-tenant databases...');

  const tenantId = 'default-tenant-id';

  // 1. Create Tenant
  await prisma.tenants.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Infinity Cafe & Bistro',
      plan: 'enterprise',
      is_active: true,
    },
  });
  console.log('✔ Tenant created');

  // 2. Create Users
  const users = [
    {
      id: 'admin_user',
      tenant_id: tenantId,
      name: 'Administrator',
      passcode: '1234',
      role: 'admin',
    },
    {
      id: 'staff_user',
      tenant_id: tenantId,
      name: 'Staff Member',
      passcode: '4321',
      role: 'staff',
    },
  ];

  for (const user of users) {
    await prisma.users.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  console.log('✔ Users created');

  // 3. Create Settings
  const settings = [
    { tenant_id: tenantId, key: 'restaurantName', value: 'Infinity Cafe & Bistro' },
    { tenant_id: tenantId, key: 'address', value: '123 Gourmet Blvd, Food District, CA 90210' },
    { tenant_id: tenantId, key: 'phone', value: '+1 (555) 767-4387' },
    { tenant_id: tenantId, key: 'gstNumber', value: '27AAAAA1111A1Z1' },
    { tenant_id: tenantId, key: 'taxPercentage', value: '12.5' },
    { tenant_id: tenantId, key: 'currency', value: 'INR' },
    { tenant_id: tenantId, key: 'passcode', value: '1234' },
    { tenant_id: tenantId, key: 'enableGst', value: 'true' },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: {
        tenant_id_key: {
          tenant_id: setting.tenant_id,
          key: setting.key,
        },
      },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✔ Settings created');

  // 4. Create Tables
  const tables = [
    { id: 't1', tenant_id: tenantId, table_number: 'T-01', capacity: 2, status: 'available' },
    { id: 't2', tenant_id: tenantId, table_number: 'T-02', capacity: 4, status: 'available' },
    { id: 't3', tenant_id: tenantId, table_number: 'T-03', capacity: 4, status: 'available' },
    { id: 't4', tenant_id: tenantId, table_number: 'T-04', capacity: 6, status: 'available' },
    { id: 't5', tenant_id: tenantId, table_number: 'T-05', capacity: 8, status: 'available' },
    { id: 't6', tenant_id: tenantId, table_number: 'T-06', capacity: 2, status: 'available' },
    { id: 't7', tenant_id: tenantId, table_number: 'T-07', capacity: 4, status: 'available' },
    { id: 't8', tenant_id: tenantId, table_number: 'T-08', capacity: 6, status: 'available' },
  ];

  for (const table of tables) {
    await prisma.tables.upsert({
      where: { id: table.id },
      update: {},
      create: table,
    });
  }
  console.log('✔ Tables created');

  // 5. Create Menu Categories
  const categories = [
    { id: 'cat1', tenant_id: tenantId, name: 'Starters', slug: 'starters' },
    { id: 'cat2', tenant_id: tenantId, name: 'Main Course', slug: 'main-course' },
    { id: 'cat3', tenant_id: tenantId, name: 'Beverages', slug: 'beverages' },
    { id: 'cat4', tenant_id: tenantId, name: 'Desserts', slug: 'desserts' },
    { id: 'cat5', tenant_id: tenantId, name: 'Special Items', slug: 'special-items' },
  ];

  for (const cat of categories) {
    await prisma.menu_categories.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  console.log('✔ Categories created');

  // 6. Create Menu Items
  const menuItems = [
    {
      id: 'm1',
      tenant_id: tenantId,
      name: 'Crispy Spring Rolls',
      category_id: 'cat1',
      description: 'Golden fried vegetable rolls served with sweet chili dip.',
      price: 150,
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm2',
      tenant_id: tenantId,
      name: 'Garlic Parmesan Wings',
      category_id: 'cat1',
      description: 'Crispy chicken wings tossed in rich butter, garlic, and fresh parmesan.',
      price: 250,
      image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm3',
      tenant_id: tenantId,
      name: 'Bruschetta Classic',
      category_id: 'cat1',
      description: 'Toasted baguette topped with diced tomatoes, garlic, basil, and balsamic glaze.',
      price: 180,
      image_url: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm4',
      tenant_id: tenantId,
      name: 'Truffle Ribeye Steak',
      category_id: 'cat2',
      description: 'USDA Prime ribeye steak served with truffle herb butter and asparagus.',
      price: 650,
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm5',
      tenant_id: tenantId,
      name: 'Fettuccine Alfredo with Chicken',
      category_id: 'cat2',
      description: 'Creamy alfredo sauce tossed with fettuccine and grilled chicken.',
      price: 350,
      image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm6',
      tenant_id: tenantId,
      name: 'Pan Seared Salmon',
      category_id: 'cat2',
      description: 'Fresh salmon fillet pan-seared and served with lemon dill cream sauce.',
      price: 480,
      image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm7',
      tenant_id: tenantId,
      name: 'Iced Caramel Macchiato',
      category_id: 'cat3',
      description: 'Espresso with cold milk and rich caramel syrup over ice.',
      price: 120,
      image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm8',
      tenant_id: tenantId,
      name: 'Fresh Mint Mojito',
      category_id: 'cat3',
      description: 'Refreshing sparkling drink infused with fresh mint and lime.',
      price: 150,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm9',
      tenant_id: tenantId,
      name: 'Molten Lava Chocolate Cake',
      category_id: 'cat4',
      description: 'Warm chocolate cake with molten center, served with vanilla ice cream.',
      price: 200,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
    {
      id: 'm10',
      tenant_id: tenantId,
      name: 'Classic New York Cheesecake',
      category_id: 'cat4',
      description: 'Cheesecake on graham cracker crust with strawberry compote.',
      price: 220,
      image_url: 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=500&auto=format&fit=crop&q=60',
      is_available: true,
    },
  ];

  for (const item of menuItems) {
    await prisma.menu_items.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log('✔ Menu items created');

  // 7. Create Customers
  const customers = [
    { id: 'c1', tenant_id: tenantId, name: 'Mehar Medavarapu', mobile: '9876543210', address: 'Tech Enclave, Suite 501, San Francisco', notes: 'Regular VIP guest.' },
    { id: 'c2', tenant_id: tenantId, name: 'Alice Johnson', mobile: '9912883477', address: '456 Oakwood St, Oakland', notes: 'Allergic to nuts.' },
  ];

  for (const customer of customers) {
    await prisma.customers.upsert({
      where: { id: customer.id },
      update: {},
      create: customer,
    });
  }
  console.log('✔ Customers created');

  // 8. Create Expense Categories
  const expenseCats = [
    { id: 'ec1', tenant_id: tenantId, name: 'Grocery' },
    { id: 'ec2', tenant_id: tenantId, name: 'Vegetables' },
    { id: 'ec3', tenant_id: tenantId, name: 'Meat' },
    { id: 'ec4', tenant_id: tenantId, name: 'Salaries' },
    { id: 'ec5', tenant_id: tenantId, name: 'Rent' },
  ];

  for (const ec of expenseCats) {
    await prisma.expense_categories.upsert({
      where: { id: ec.id },
      update: {},
      create: ec,
    });
  }
  console.log('✔ Expense categories created');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
