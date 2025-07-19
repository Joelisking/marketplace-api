import { z } from 'zod';
export const IDParam = z.object({
    id: z.string().describe('Resource ID'),
});
export const SlugParam = z.object({
    slug: z.string().describe('Resource slug'),
});
export const PaginationQuery = z
    .object({
    q: z.string().optional().describe('Search query'),
    page: z
        .string()
        .regex(/^\d+$/)
        .transform((s) => parseInt(s, 10))
        .optional()
        .describe('1-based page number'),
})
    .partial();
export const PageMeta = z.object({
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
});
