/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../lib/prisma';

export async function listProducts(params: {
  q?: string;
  category?: string;
  storeId?: string;
  page: number;
  limit: number;
}) {
  const { q, category, storeId, page, limit } = params;

  // If we have a search query, use enhanced search with pg_trgm
  if (q) {
    return enhancedSearch({ ...params, q });
  }

  const whereConditions = [];

  if (storeId) {
    whereConditions.push({ storeId });
  }

  if (category) {
    whereConditions.push({ category: { equals: category } });
  }

  whereConditions.push({ visibleMarket: true });

  return prisma.product.findMany({
    where: {
      AND: whereConditions as any,
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
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Enhanced search using pg_trgm for fuzzy matching
 */
async function enhancedSearch(params: {
  q: string;
  category?: string;
  storeId?: string;
  page: number;
  limit: number;
}) {
  const { q, category, storeId, page, limit } = params;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = ['p."visibleMarket" = true'];
  const params_array: any[] = [q];

  if (storeId) {
    conditions.push('p."storeId" = $' + (params_array.length + 1));
    params_array.push(storeId);
  }

  if (category) {
    conditions.push('p."category" = $' + (params_array.length + 1));
    params_array.push(category);
  }

  const whereClause = conditions.join(' AND ');

  // Query with pg_trgm similarity
  const query = `
    SELECT 
      p.*,
      s.id as "storeId",
      s.name as "storeName",
      s.slug as "storeSlug",
      GREATEST(
        similarity(p.name, $1),
        similarity(COALESCE(p.description, ''), $1)
      ) as similarity_score
    FROM "Product" p
    LEFT JOIN "Store" s ON p."storeId" = s.id
    WHERE ${whereClause}
      AND (
        p.name ILIKE $1 
        OR p.description ILIKE $1
        OR p.name % $1
        OR p.description % $1
      )
    ORDER BY 
      CASE WHEN p.name ILIKE $1 THEN 1 ELSE 2 END,
      similarity_score DESC,
      p."createdAt" DESC
    LIMIT $${params_array.length + 1} OFFSET $${params_array.length + 2}
  `;

  const products = await prisma.$queryRawUnsafe(query, ...params_array, limit, offset);

  // Transform the raw results to match Prisma format
  return (products as any[]).map((product) => ({
    ...product,
    store: {
      id: product.storeId,
      name: product.storeName,
      slug: product.storeSlug,
    },
    storeId: product.storeId,
  }));
}

export function countProducts(where: Record<string, unknown>) {
  return prisma.product.count({ where });
}
