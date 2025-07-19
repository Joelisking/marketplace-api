import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user/vendor
  const user = await prisma.user.upsert({
    where: { email: 'vendor@kofi.com' },
    update: {},
    create: {
      email: 'vendor@kofi.com',
      password: '$2b$10$hash', // hash of "password"
      role: 'VENDOR',
    },
  });

  // Create a test store
  const store = await prisma.store.upsert({
    where: { slug: 'kofi-fashion' },
    update: {},
    create: {
      id: 'store1', // deterministic for tests
      name: 'Kofi Fashion',
      slug: 'kofi-fashion',
      logoUrl: 'https://picsum.photos/200',
      owner: {
        connect: { id: user.id },
      },
      products: {
        createMany: {
          data: [
            {
              id: 'prod1',
              name: 'Blue Ankara Shirt',
              price: 9500,
              stock: 20,
              imageUrl: 'https://picsum.photos/400',
              visibleMarket: true,
            },
            {
              id: 'prod2',
              name: 'Kente Tote Bag',
              price: 4500,
              stock: 50,
              imageUrl: 'https://picsum.photos/400',
              visibleMarket: true,
            },
            {
              id: 'prod3',
              name: 'Traditional Beaded Necklace',
              price: 7500,
              stock: 15,
              imageUrl: 'https://picsum.photos/400',
              visibleMarket: true,
            },
          ],
        },
      },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created user: ${user.email}`);
  console.log(`Created store: ${store.name}`);
  console.log(`Created 3 products`);
}

main().finally(() => prisma.$disconnect());
