"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreListQuery = exports.StoreSlugParam = exports.StoreSearchQuery = exports.StoreListResponse = exports.StoreResponse = exports.StoreUpdate = exports.StoreCreate = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.StoreCreate = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().regex(/^[a-z0-9-]+$/),
    logoUrl: zod_1.z.url().optional(),
});
exports.StoreUpdate = exports.StoreCreate.partial();
exports.StoreResponse = zod_1.z.object({
    id: zod_1.z.string(),
    ownerId: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    logoUrl: zod_1.z.string().nullable(),
    owner: zod_1.z
        .object({
        id: zod_1.z.string(),
        email: zod_1.z.string(),
    })
        .optional(),
});
exports.StoreListResponse = zod_1.z.object({
    items: zod_1.z.array(exports.StoreResponse),
    meta: common_1.PageMeta,
});
exports.StoreSearchQuery = zod_1.z.object({
    q: zod_1.z.string().optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
});
exports.StoreSlugParam = common_1.SlugParam;
exports.StoreListQuery = common_1.PaginationQuery;
