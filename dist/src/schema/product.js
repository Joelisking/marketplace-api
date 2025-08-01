import { z } from 'zod';
import { PaginationQuery, PageMeta } from './common';
export const ProductImageBase = z.object({
    fileName: z.string().min(1),
    fileUrl: z.url(),
    altText: z.string().optional(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
});
export const ProductImageCreate = ProductImageBase;
export const ProductImageUpdate = ProductImageBase.partial();
export const ProductImageResponse = ProductImageBase.extend({
    id: z.string(),
    productId: z.string(),
    createdAt: z.string().datetime(),
});
export const ProductBase = z.object({
    name: z.string().min(1),
    price: z.number().int().nonnegative(),
    stock: z.number().int().nonnegative(),
    visibleMarket: z.boolean().default(true),
});
export const ProductCreate = ProductBase.extend({
    images: z.array(ProductImageCreate).optional(), // Optional: can create product with or without images
});
export const ProductUpdate = ProductBase.partial().extend({
    images: z.array(ProductImageCreate).optional(),
});
export const ProductResponse = ProductBase.extend({
    id: z.string(),
    storeId: z.string(),
    imageUrl: z.string(), // Keep in response for backward compatibility with frontend
    images: z.array(ProductImageResponse).optional(),
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
export const ProductIdParam = z.object({
    id: z.string().describe('Product ID'),
});
export const ProductListQuery = PaginationQuery;
export const ProductSearchQuery = z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    storeId: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
// New: Image management endpoints
export const ProductImageIdParam = z.object({
    productId: z.string(),
    imageId: z.string(),
});
export const ProductImageReorderRequest = z.object({
    imageIds: z.array(z.string()).min(1), // Array of image IDs in desired order
});
