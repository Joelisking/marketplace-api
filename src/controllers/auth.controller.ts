import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
import { RegisterBody, LoginBody, RefreshBody, AuthResponse } from '../schema';
import { signAccess, signRefresh, verifyToken } from '../utils/jwt';

export async function register(req: Request, res: Response) {
  const body = RegisterBody.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ message: 'Email already in use' });

  const password = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { email: body.email, password, role: 'CUSTOMER' },
  });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh({ sub: user.id });

  const response: z.infer<typeof AuthResponse> = { accessToken, refreshToken, user };
  res.status(201).json(response);
}

export async function login(req: Request, res: Response) {
  const body = LoginBody.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await bcrypt.compare(body.password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = signAccess(user);
  const refreshToken = signRefresh({ sub: user.id });

  const response: z.infer<typeof AuthResponse> = { accessToken, refreshToken, user };
  res.json(response);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = RefreshBody.parse(req.body);
  const decoded = verifyToken<{ sub: string }>(refreshToken);

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  const accessToken = signAccess(user);
  const newRefresh = signRefresh({ sub: user.id });
  const response: z.infer<typeof AuthResponse> = { accessToken, refreshToken: newRefresh, user };
  res.json(response);
}

export async function getAllUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany();
  res.json(users);
}
