import { z } from 'zod';
import { SlugParam, PaginationQuery, PageMeta } from './common';

export const StoreCreate = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  logoUrl: z.url().optional(),
});

export const StoreUpdate = StoreCreate.partial();

export const StoreResponse = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  owner: z
    .object({
      id: z.string(),
      email: z.string(),
    })
    .optional(),
});

export const StoreListResponse = z.object({
  items: z.array(StoreResponse),
  meta: PageMeta,
});

export const StoreSearchQuery = z.object({
  q: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const StoreSlugParam = SlugParam;
export const StoreListQuery = PaginationQuery;
