import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../src/modules/accounting/chart-of-accounts';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@demo.shop';
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('Seed already applied (demo admin exists). Skipping.');
    return;
  }

  const shop = await prisma.shop.create({
    data: {
      name: 'Demo Shop',
      businessType: 'BOTH',
      currency: 'NPR',
      taxRate: 13,
      accounts: {
        create: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
          code: a.code,
          name: a.name,
          type: a.type,
          isSystem: a.isSystem,
        })),
      },
    },
  });

  await prisma.user.create({
    data: {
      shopId: shop.id,
      email,
      passwordHash: await bcrypt.hash('admin123', 10),
      fullName: 'Demo Admin',
      role: 'ADMIN',
    },
  });

  // A couple of demo products
  await prisma.product.createMany({
    data: [
      {
        shopId: shop.id,
        sku: 'SKU-0001',
        barcode: '8901234567890',
        name: 'Coca-Cola 250ml',
        purchasePrice: 40,
        salePrice: 60,
        stock: 100,
        taxRate: 13,
      },
      {
        shopId: shop.id,
        sku: 'SKU-0002',
        name: 'Veg Momo (plate)',
        purchasePrice: 60,
        salePrice: 120,
        stock: 50,
        taxRate: 13,
      },
    ],
  });

  // A demo restaurant table
  await prisma.restaurantTable.create({
    data: { shopId: shop.id, name: 'T1', area: 'Ground Floor', seats: 4 },
  });

  console.log('Seeded demo shop:', shop.id);
  console.log('Login: admin@demo.shop / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
