/**
 * OTP Routes
 */

import { Router } from 'express';
import {
  sendEmailOtp,
  sendPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
  resendEmailOtp,
  resendPhoneOtp,
} from '../controllers/otp.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

// Send OTP (can be used before authentication for registration)
router.post('/send-email', optionalAuth, sendEmailOtp);
router.post('/send-phone', authenticate, sendPhoneOtp); // Requires auth

// Verify OTP
router.post('/verify-email', optionalAuth, verifyEmailOtp);
router.post('/verify-phone', authenticate, verifyPhoneOtp); // Requires auth

// Resend OTP
router.post('/resend-email', optionalAuth, resendEmailOtp);
router.post('/resend-phone', authenticate, resendPhoneOtp); // Requires auth

export default router;
