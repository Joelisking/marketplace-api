"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserIdParam = exports.MeResponse = exports.AuthResponse = exports.UserResponse = exports.RefreshBody = exports.LoginBody = exports.RegisterBody = void 0;
// src/schema/user.ts
const zod_1 = require("zod");
const common_1 = require("./common");
exports.RegisterBody = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(8),
});
exports.LoginBody = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(8),
});
exports.RefreshBody = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
exports.UserResponse = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.email(),
    role: zod_1.z.enum(['CUSTOMER', 'VENDOR']),
    storeId: zod_1.z.string().nullable(),
});
exports.AuthResponse = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    user: exports.UserResponse,
});
exports.MeResponse = exports.UserResponse;
exports.UserIdParam = common_1.IDParam;
