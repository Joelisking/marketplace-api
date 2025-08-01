// src/schema/user.ts
import { z } from 'zod';
import { IDParam } from './common';

export const RegisterBody = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER']).default('CUSTOMER'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const LoginBody = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const RefreshBody = z.object({
  refreshToken: z.string(),
});

export const UpdateUserBody = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const UserResponse = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER']),
  storeId: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export const AuthResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserResponse,
});

export const MeResponse = z.object({
  user: UserResponse,
});

export const UserIdParam = IDParam;
