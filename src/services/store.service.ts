import { prisma } from '../lib/prisma';

export async function listStores(params: { q?: string; page: number; limit: number }) {
  const { q, page, limit } = params;
  const stores = await prisma.store.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' as const } } : {},
    skip: (page - 1) * limit,
    take: limit,
    include: {
      owner: true,
    },
  });

  return stores.map((store) => ({
    id: store.id,
    ownerId: store.owner?.id || '',
    name: store.name,
    slug: store.slug,
    logoUrl: store.logoUrl,
  }));
}

export function countStores(where: Record<string, unknown>) {
  return prisma.store.count({ where });
}
