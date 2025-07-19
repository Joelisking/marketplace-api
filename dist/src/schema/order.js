"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderListQuery = exports.OrderIdParam = exports.OrderListResponse = exports.OrderResponse = exports.OrderItemResponse = exports.CheckoutBody = exports.CheckoutItem = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.CheckoutItem = zod_1.z.object({
    productId: zod_1.z.cuid(),
    quantity: zod_1.z.number().int().min(1),
});
exports.CheckoutBody = zod_1.z.object({
    items: zod_1.z.array(exports.CheckoutItem).min(1),
});
exports.OrderItemResponse = zod_1.z.object({
    id: zod_1.z.string(),
    productId: zod_1.z.string(),
    quantity: zod_1.z.number().int(),
    price: zod_1.z.number().int(),
});
exports.OrderResponse = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    storeId: zod_1.z.string(),
    status: zod_1.z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
    paymentStatus: zod_1.z.enum(['UNPAID', 'PAID']),
    total: zod_1.z.number().int(),
    items: zod_1.z.array(exports.OrderItemResponse),
});
exports.OrderListResponse = zod_1.z.object({
    items: zod_1.z.array(exports.OrderResponse),
    meta: common_1.PageMeta,
});
exports.OrderIdParam = common_1.IDParam;
exports.OrderListQuery = common_1.PaginationQuery.extend({
    storeId: zod_1.z.string().optional(),
});
