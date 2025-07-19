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
    status: z.enum([
        'PENDING',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CONFIRMED',
        'CANCELLED',
        'REFUNDED',
    ]),
    paymentStatus: z.enum(['UNPAID', 'PAID', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED']),
    total: z.number().int(),
    subtotal: z.number().int(),
    tax: z.number().int(),
    shipping: z.number().int(),
    discount: z.number().int(),
    currency: z.string(),
    items: z.array(OrderItemResponse),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
});
export const OrderListResponse = z.object({
    items: z.array(OrderResponse),
    meta: PageMeta,
});
export const OrderIdParam = IDParam;
export const OrderListQuery = PaginationQuery.extend({
    storeId: z.string().optional(),
    status: z
        .enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'CANCELLED', 'REFUNDED'])
        .optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
export const UpdateOrderStatusBody = z.object({
    status: z.enum([
        'PENDING',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CONFIRMED',
        'CANCELLED',
        'REFUNDED',
    ]),
    reason: z.string().optional(),
});
export const OrderStatsQuery = z.object({
    days: z.number().int().min(1).max(365).default(30),
});
