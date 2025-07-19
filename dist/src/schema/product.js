"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSearchQuery = exports.ProductListQuery = exports.ProductIdParam = exports.ProductListResponse = exports.ProductResponse = exports.ProductUpdate = exports.ProductCreate = exports.ProductBase = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.ProductBase = zod_1.z.object({
    name: zod_1.z.string().min(1),
    price: zod_1.z.number().int().nonnegative(),
    stock: zod_1.z.number().int().nonnegative(),
    imageUrl: zod_1.z.url(),
    visibleMarket: zod_1.z.boolean().default(true),
});
exports.ProductCreate = exports.ProductBase;
exports.ProductUpdate = exports.ProductBase.partial();
exports.ProductResponse = exports.ProductBase.extend({
    id: zod_1.z.string(),
    storeId: zod_1.z.string(),
    store: zod_1.z
        .object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        slug: zod_1.z.string(),
    })
        .optional(),
});
exports.ProductListResponse = zod_1.z.object({
    items: zod_1.z.array(exports.ProductResponse),
    meta: common_1.PageMeta,
});
exports.ProductIdParam = common_1.IDParam;
exports.ProductListQuery = common_1.PaginationQuery.extend({
    storeId: zod_1.z.string().optional(),
});
exports.ProductSearchQuery = zod_1.z.object({
    q: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    storeId: zod_1.z.string().optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
});
