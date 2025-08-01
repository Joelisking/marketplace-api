// src/schema/cart.ts
import { z } from 'zod';

export const AddToCartBody = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
});

export const UpdateCartItemBody = z.object({
  quantity: z.number().int().positive().max(100),
});

export const CartItemResponse = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    imageUrl: z.string(),
  }),
});

export const CartSummaryResponse = z.object({
  items: z.array(CartItemResponse),
  totalItems: z.number(),
  subtotal: z.number(),
  estimatedTax: z.number(),
  estimatedShipping: z.number(),
  total: z.number(),
});

export const CartItemIdParam = z.object({
  productId: z.string().describe('Product ID'),
});
