import { z } from 'zod';
import { IDParam, PaginationQuery, PageMeta } from './common';
export const CheckoutItem = z.object({
    productId: z.cuid(),
    quantity: z.number().int().min(1),
});
export const CheckoutBody = z.object({
    items: z.array(CheckoutItem).min(1),
});
export const OrderItemResponse = z.object({
    id: z.string(),
    productId: z.string(),
    quantity: z.number().int(),
    price: z.number().int(),
});
export const OrderResponse = z.object({
    id: z.string(),
    customerId: z.string(),
    storeId: z.string(),
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
    paymentStatus: z.enum(['UNPAID', 'PAID']),
    total: z.number().int(),
    items: z.array(OrderItemResponse),
});
export const OrderListResponse = z.object({
    items: z.array(OrderResponse),
    meta: PageMeta,
});
export const OrderIdParam = IDParam;
export const OrderListQuery = PaginationQuery.extend({
    storeId: z.string().optional(),
});
