/**
 * OTP Service
 * Handles OTP generation, sending, and verification for email and phone
 */

import { prisma } from '../lib/prisma';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { logger } from '../utils/logger';

export type OtpType = 'EMAIL' | 'PHONE';
export type OtpPurpose =
  | 'REGISTRATION'
  | 'PHONE_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'TRANSACTION';

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresIn?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

class OtpService {
  private OTP_EXPIRY_MINUTES = 15; // Email OTP expires in 15 minutes
  private PHONE_OTP_EXPIRY_MINUTES = 5; // Phone OTP expires in 5 minutes
  private MAX_ATTEMPTS = 3;

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via email
   */
  async sendEmailOtp(
    email: string,
    purpose: OtpPurpose,
    userId?: string,
    userName?: string
  ): Promise<SendOtpResult> {
    try {
      // Invalidate any existing unused OTPs for this email
      await this.invalidateExistingOtps(email, 'EMAIL', purpose);

      // Generate new OTP
      const code = this.generateOtpCode();
      const expiresAt = new Date(
        Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000
      );

      // Store OTP in database
      await prisma.otpVerification.create({
        data: {
          userId,
          type: 'EMAIL',
          purpose,
          recipient: email.toLowerCase(),
          code,
          expiresAt,
          maxAttempts: this.MAX_ATTEMPTS,
        },
      });

      // Send OTP via email
      const emailResult = await emailService.sendOtpEmail(email, code, userName);

      if (!emailResult.success) {
        logger.error(`Failed to send OTP email to ${email}:`, emailResult.error);
        return {
          success: false,
          message: 'Failed to send verification email. Please try again.',
        };
      }

      logger.info(`OTP sent successfully to email: ${email}`);
      return {
        success: true,
        message: 'Verification code sent to your email',
        expiresIn: this.OTP_EXPIRY_MINUTES,
      };
    } catch (error) {
      logger.error('Error sending email OTP:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again later.',
      };
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendPhoneOtp(
    phone: string,
    purpose: OtpPurpose,
    userId?: string,
    userName?: string
  ): Promise<SendOtpResult> {
    try {
      // Validate phone number format (Ghana numbers)
      const cleanPhone = this.cleanPhoneNumber(phone);
      if (!this.isValidGhanaPhone(cleanPhone)) {
        return {
          success: false,
          message: 'Invalid phone number format. Please use a valid Ghana number.',
        };
      }

      // Invalidate any existing unused OTPs for this phone
      await this.invalidateExistingOtps(cleanPhone, 'PHONE', purpose);

      // Generate new OTP
      const code = this.generateOtpCode();
      const expiresAt = new Date(
        Date.now() + this.PHONE_OTP_EXPIRY_MINUTES * 60 * 1000
      );

      // Store OTP in database
      await prisma.otpVerification.create({
        data: {
          userId,
          type: 'PHONE',
          purpose,
          recipient: cleanPhone,
          code,
          expiresAt,
          maxAttempts: this.MAX_ATTEMPTS,
        },
      });

      // Send OTP via SMS
      const smsResult = await smsService.sendOtp(cleanPhone, code, userName);

      if (!smsResult.success) {
        logger.error(`Failed to send OTP SMS to ${cleanPhone}:`, smsResult.error);
        return {
          success: false,
          message: 'Failed to send verification SMS. Please try again.',
        };
      }

      logger.info(`OTP sent successfully to phone: ${cleanPhone}`);
      return {
        success: true,
        message: 'Verification code sent to your phone',
        expiresIn: this.PHONE_OTP_EXPIRY_MINUTES,
      };
    } catch (error) {
      logger.error('Error sending phone OTP:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again later.',
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    recipient: string,
    code: string,
    type: OtpType,
    purpose: OtpPurpose
  ): Promise<VerifyOtpResult> {
    try {
      const cleanRecipient =
        type === 'EMAIL' ? recipient.toLowerCase() : this.cleanPhoneNumber(recipient);

      // Find the OTP record
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          recipient: cleanRecipient,
          type,
          purpose,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired verification code',
        };
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await this.markOtpAsUsed(otpRecord.id);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new code.',
        };
      }

      // Verify the code
      if (otpRecord.code !== code) {
        // Increment attempt count
        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });

        const remainingAttempts =
          otpRecord.maxAttempts - (otpRecord.attempts + 1);
        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        };
      }

      // Mark OTP as verified and used
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          verifiedAt: new Date(),
          isUsed: true,
        },
      });

      logger.info(`OTP verified successfully for ${cleanRecipient}`);
      return {
        success: true,
        message: 'Verification successful',
      };
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(
    recipient: string,
    type: OtpType,
    purpose: OtpPurpose,
    userId?: string,
    userName?: string
  ): Promise<SendOtpResult> {
    // Check rate limiting (max 3 OTPs in 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const cleanRecipient =
      type === 'EMAIL' ? recipient.toLowerCase() : this.cleanPhoneNumber(recipient);

    const recentOtps = await prisma.otpVerification.count({
      where: {
        recipient: cleanRecipient,
        type,
        purpose,
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
    });

    if (recentOtps >= 3) {
      return {
        success: false,
        message: 'Too many requests. Please try again in 10 minutes.',
      };
    }

    // Send new OTP
    if (type === 'EMAIL') {
      return await this.sendEmailOtp(recipient, purpose, userId, userName);
    } else {
      return await this.sendPhoneOtp(recipient, purpose, userId, userName);
    }
  }

  /**
   * Invalidate existing OTPs
   */
  private async invalidateExistingOtps(
    recipient: string,
    type: OtpType,
    purpose: OtpPurpose
  ): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: {
        recipient,
        type,
        purpose,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });
  }

  /**
   * Mark OTP as used
   */
  private async markOtpAsUsed(otpId: string): Promise<void> {
    await prisma.otpVerification.update({
      where: { id: otpId },
      data: { isUsed: true },
    });
  }

  /**
   * Clean phone number (remove spaces, dashes, etc.)
   */
  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Validate Ghana phone number
   */
  private isValidGhanaPhone(phone: string): boolean {
    const cleanPhone = this.cleanPhoneNumber(phone);
    // Ghana numbers: 233XXXXXXXXX (12 digits) or 0XXXXXXXXX (10 digits)
    return /^(233|0)\d{9}$/.test(cleanPhone);
  }

  /**
   * Clean up expired OTPs (to be run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await prisma.otpVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired OTPs`);
    return result.count;
  }
}

export const otpService = new OtpService();
