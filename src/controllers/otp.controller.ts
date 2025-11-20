/**
 * OTP Controller
 * Handles OTP sending and verification endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { otpService } from '../services/otp.service';
import { prisma } from '../lib/prisma';
import { asyncHandler, createError } from '../middlewares/error-handler';

// Request schemas
const SendEmailOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION']).default('REGISTRATION'),
});

const SendPhoneOtpSchema = z.object({
  phone: z.string().min(10),
  purpose: z.enum(['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION']).default('PHONE_VERIFICATION'),
});

const VerifyEmailOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.enum(['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION']).default('REGISTRATION'),
});

const VerifyPhoneOtpSchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
  purpose: z.enum(['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION']).default('PHONE_VERIFICATION'),
});

/**
 * Send OTP to email
 * POST /api/otp/send-email
 */
export const sendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = SendEmailOtpSchema.parse(req.body);

  // Get user info if authenticated
  const userId = (req as any).user?.id;
  const userName = (req as any).user?.firstName;

  const result = await otpService.sendEmailOtp(
    body.email,
    body.purpose,
    userId,
    userName
  );

  if (!result.success) {
    throw createError(result.message, 400);
  }

  res.json({
    success: true,
    message: result.message,
    expiresIn: result.expiresIn,
  });
});

/**
 * Send OTP to phone
 * POST /api/otp/send-phone
 */
export const sendPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = SendPhoneOtpSchema.parse(req.body);

  // Get user info if authenticated
  const userId = (req as any).user?.id;
  const userName = (req as any).user?.firstName;

  const result = await otpService.sendPhoneOtp(
    body.phone,
    body.purpose,
    userId,
    userName
  );

  if (!result.success) {
    throw createError(result.message, 400);
  }

  res.json({
    success: true,
    message: result.message,
    expiresIn: result.expiresIn,
  });
});

/**
 * Verify email OTP
 * POST /api/otp/verify-email
 */
export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = VerifyEmailOtpSchema.parse(req.body);

  const result = await otpService.verifyOtp(
    body.email,
    body.code,
    'EMAIL',
    body.purpose
  );

  if (!result.success) {
    throw createError(result.message, 400);
  }

  // If this is a registration verification, mark email as verified
  if (body.purpose === 'REGISTRATION') {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }
  }

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * Verify phone OTP
 * POST /api/otp/verify-phone
 */
export const verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = VerifyPhoneOtpSchema.parse(req.body);

  // Must be authenticated to verify phone
  const userId = (req as any).user?.id;
  if (!userId) {
    throw createError('Authentication required', 401);
  }

  const result = await otpService.verifyOtp(
    body.phone,
    body.code,
    'PHONE',
    body.purpose
  );

  if (!result.success) {
    throw createError(result.message, 400);
  }

  // Mark phone as verified
  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      phone: body.phone, // Update phone if not set
    },
  });

  res.json({
    success: true,
    message: result.message,
  });
});

/**
 * Resend email OTP
 * POST /api/otp/resend-email
 */
export const resendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = SendEmailOtpSchema.parse(req.body);

  const userId = (req as any).user?.id;
  const userName = (req as any).user?.firstName;

  const result = await otpService.resendOtp(
    body.email,
    'EMAIL',
    body.purpose,
    userId,
    userName
  );

  if (!result.success) {
    throw createError(result.message, 429); // Too many requests
  }

  res.json({
    success: true,
    message: result.message,
    expiresIn: result.expiresIn,
  });
});

/**
 * Resend phone OTP
 * POST /api/otp/resend-phone
 */
export const resendPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = SendPhoneOtpSchema.parse(req.body);

  const userId = (req as any).user?.id;
  const userName = (req as any).user?.firstName;

  const result = await otpService.resendOtp(
    body.phone,
    'PHONE',
    body.purpose,
    userId,
    userName
  );

  if (!result.success) {
    throw createError(result.message, 429); // Too many requests
  }

  res.json({
    success: true,
    message: result.message,
    expiresIn: result.expiresIn,
  });
});
