import { prisma } from '../lib/prisma';

export async function listProducts(params: {
  q?: string;
  category?: string;
  storeId?: string;
  page: number;
  limit: number;
}) {
  const { q, category, storeId, page, limit } = params;

  const whereConditions = [];

  if (storeId) {
    whereConditions.push({ storeId });
  }

  if (q) {
    whereConditions.push({ name: { contains: q, mode: 'insensitive' as const } });
  }

  if (category) {
    // Note: Category filtering is not implemented in the current schema
    // This would need to be added to the Product model in Prisma schema
    console.warn('Category filtering requested but not implemented');
  }

  whereConditions.push({ visibleMarket: true });

  return prisma.product.findMany({
    where: {
      AND: whereConditions,
    },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export function countProducts(where: Record<string, unknown>) {
  return prisma.product.count({ where });
}
