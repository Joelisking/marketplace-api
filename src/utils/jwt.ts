import jwt, { Secret } from 'jsonwebtoken';
import { User } from '@prisma/client';

const ACCESS_EXP = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const SECRET = process.env.JWT_SECRET! as Secret;

export function signAccess(user: Pick<User, 'id' | 'role' | 'storeId'>) {
  return jwt.sign(user, SECRET, { expiresIn: ACCESS_EXP as any });
}

export function signRefresh(payload: { sub: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXP as any });
}

export function verifyToken<T = any>(token: string) {
  return jwt.verify(token, SECRET) as T;
}
