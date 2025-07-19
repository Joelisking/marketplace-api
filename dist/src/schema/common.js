"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageMeta = exports.PaginationQuery = exports.SlugParam = exports.IDParam = void 0;
const zod_1 = require("zod");
exports.IDParam = zod_1.z.object({
    id: zod_1.z.string().describe('Resource ID'),
});
exports.SlugParam = zod_1.z.object({
    slug: zod_1.z.string().describe('Resource slug'),
});
exports.PaginationQuery = zod_1.z
    .object({
    q: zod_1.z.string().optional().describe('Search query'),
    page: zod_1.z
        .string()
        .regex(/^\d+$/)
        .transform((s) => parseInt(s, 10))
        .optional()
        .describe('1-based page number'),
})
    .partial();
exports.PageMeta = zod_1.z.object({
    total: zod_1.z.number().int(),
    page: zod_1.z.number().int(),
    pageSize: zod_1.z.number().int(),
});
