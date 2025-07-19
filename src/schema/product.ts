import { z } from 'zod';
import { IDParam, PaginationQuery, PageMeta } from './common';

export const ProductBase = z.object({
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  imageUrl: z.url(),
  visibleMarket: z.boolean().default(true),
});

export const ProductCreate = ProductBase;

export const ProductUpdate = ProductBase.partial();

export const ProductResponse = ProductBase.extend({
  id: z.string(),
  storeId: z.string(),
  store: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .optional(),
});

export const ProductListResponse = z.object({
  items: z.array(ProductResponse),
  meta: PageMeta,
});

export const ProductIdParam = IDParam;
export const ProductListQuery = PaginationQuery.extend({
  storeId: z.string().optional(),
});

export const ProductSearchQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  storeId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
