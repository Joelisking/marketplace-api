import { prisma } from '../lib/prisma';

export async function listStores(params: { q?: string; page: number; limit: number }) {
  const { q, page, limit } = params;

  // If we have a search query, use enhanced search with pg_trgm
  if (q) {
    return enhancedStoreSearch({ ...params, q });
  }

  const stores = await prisma.store.findMany({
    where: {},
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

/**
 * Enhanced store search using pg_trgm for fuzzy matching
 */
async function enhancedStoreSearch(params: { q: string; page: number; limit: number }) {
  const { q, page, limit } = params;
  const offset = (page - 1) * limit;

  // Query with pg_trgm similarity
  const query = `
    SELECT 
      s.*,
      u.id as "ownerId",
      similarity(s.name, $1) as similarity_score
    FROM "Store" s
    LEFT JOIN "User" u ON s."vendorId" = u.id
    WHERE s."isActive" = true
      AND (
        s.name ILIKE $1 
        OR s.name % $1
      )
    ORDER BY 
      CASE WHEN s.name ILIKE $1 THEN 1 ELSE 2 END,
      similarity_score DESC,
      s."createdAt" DESC
    LIMIT $2 OFFSET $3
  `;

  const stores = await prisma.$queryRawUnsafe(query, q, limit, offset);

  // Transform the raw results to match expected format
  return (
    stores as Array<{ id: string; ownerId: string; name: string; slug: string; logoUrl: string }>
  ).map((store) => ({
    id: store.id,
    ownerId: store.ownerId || '',
    name: store.name,
    slug: store.slug,
    logoUrl: store.logoUrl,
  }));
}

export function countStores(where: Record<string, unknown>) {
  return prisma.store.count({ where });
}
