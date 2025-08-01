/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
import {
  RegisterBody,
  LoginBody,
  RefreshBody,
  AuthResponse,
  MeResponse,
  UpdateUserBody,
} from '../schema';
import { signAccess, signRefresh, verifyToken } from '../utils/jwt';
import { asyncHandler, createError } from '../middlewares/error-handler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = RegisterBody.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw createError('Email already in use', 409);

  const password = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      password,
      role: body.role,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    },
  });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh({ sub: user.id });

  const response: z.infer<typeof AuthResponse> = { accessToken, refreshToken, user };
  res.status(201).json(response);
});

export async function login(req: Request, res: Response) {
  const body = LoginBody.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      storeId: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
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

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      storeId: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  const accessToken = signAccess(user);
  const newRefresh = signRefresh({ sub: user.id });
  const response: z.infer<typeof AuthResponse> = { accessToken, refreshToken: newRefresh, user };
  res.json(response);
}

export async function getAllUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      storeId: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(users);
}

export async function me(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Get fresh user data from database
  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      role: true,
      storeId: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!freshUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const response: z.infer<typeof MeResponse> = { user: freshUser };
  res.json(response);
}

export async function updateUser(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const body = UpdateUserBody.parse(req.body);

  // Update user in database
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      storeId: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const response: z.infer<typeof MeResponse> = { user: updatedUser };
  res.json(response);
}
