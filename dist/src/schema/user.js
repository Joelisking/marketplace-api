// src/schema/user.ts
import { z } from 'zod';
import { IDParam } from './common';
export const RegisterBody = z.object({
    email: z.email(),
    password: z.string().min(8),
    role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).default('CUSTOMER'),
});
export const LoginBody = z.object({
    email: z.email(),
    password: z.string().min(8),
});
export const RefreshBody = z.object({
    refreshToken: z.string(),
});
export const UserResponse = z.object({
    id: z.string(),
    email: z.email(),
    role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']),
    storeId: z.string().nullable(),
});
export const AuthResponse = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: UserResponse,
});
export const MeResponse = UserResponse;
export const UserIdParam = IDParam;
