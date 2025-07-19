/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const ACCESS_EXP = (process.env.JWT_EXPIRES_IN || '15m') as string;
const REFRESH_EXP = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as string;
const SECRET = process.env.JWT_SECRET!;

export function signAccess(user: Pick<User, 'id' | 'role' | 'storeId'>) {
  return jwt.sign(user, SECRET, { expiresIn: ACCESS_EXP as any });
}

export function signRefresh(payload: { sub: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXP as any });
}

export function verifyToken<T = Record<string, unknown>>(token: string) {
  return jwt.verify(token, SECRET) as T;
}
