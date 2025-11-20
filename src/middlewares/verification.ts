/**
 * Verification Middleware
 * Checks if user has verified their email/phone before allowing certain actions
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Require email verification
 * Used for actions that require verified email
 */
export async function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Get fresh user data to check verification status
  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });

  if (!freshUser || !freshUser.emailVerified) {
    return res.status(403).json({
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      action: 'Please verify your email address to continue',
    });
  }

  next();
}

/**
 * Require phone verification
 * Used before checkout and before publishing products
 */
export async function requirePhoneVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Get fresh user data to check verification status
  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phoneVerified: true, phone: true },
  });

  if (!freshUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!freshUser.phone) {
    return res.status(403).json({
      message: 'Phone number required',
      code: 'PHONE_NOT_SET',
      action: 'Please add a phone number to your profile',
    });
  }

  if (!freshUser.phoneVerified) {
    return res.status(403).json({
      message: 'Phone verification required',
      code: 'PHONE_NOT_VERIFIED',
      action: 'Please verify your phone number to continue',
      phone: freshUser.phone,
    });
  }

  next();
}

/**
 * Require both email and phone verification
 * For highly sensitive operations
 */
export async function requireFullVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Get fresh user data
  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      emailVerified: true,
      phoneVerified: true,
      phone: true,
    },
  });

  if (!freshUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const missing: string[] = [];

  if (!freshUser.emailVerified) {
    missing.push('email');
  }

  if (!freshUser.phone) {
    missing.push('phone number (not set)');
  } else if (!freshUser.phoneVerified) {
    missing.push('phone');
  }

  if (missing.length > 0) {
    return res.status(403).json({
      message: 'Full verification required',
      code: 'FULL_VERIFICATION_REQUIRED',
      missing: missing,
      action: `Please verify your ${missing.join(' and ')} to continue`,
    });
  }

  next();
}
