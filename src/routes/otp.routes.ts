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
import { registry } from '../lib/openapi';

// Register OTP endpoints in OpenAPI
registry.registerPath({
  method: 'post',
  path: '/otp/send-email',
  tags: ['OTP'],
  summary: 'Send OTP to email',
  description: 'Send a verification code to an email address',
  security: [{ bearerAuth: [] }, {}],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['email', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP sent successfully' },
    400: { description: 'Bad request' },
    500: { description: 'Internal server error' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/otp/verify-email',
  tags: ['OTP'],
  summary: 'Verify email OTP',
  description: 'Verify an OTP code sent to email',
  security: [{ bearerAuth: [] }, {}],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              code: { type: 'string', pattern: '^\\d{6}$' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['email', 'code', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP verified successfully' },
    400: { description: 'Invalid or expired OTP' },
    500: { description: 'Internal server error' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/otp/resend-email',
  tags: ['OTP'],
  summary: 'Resend email OTP',
  description: 'Resend verification code to email',
  security: [{ bearerAuth: [] }, {}],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['email', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP resent successfully' },
    400: { description: 'Bad request' },
    500: { description: 'Internal server error' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/otp/send-phone',
  tags: ['OTP'],
  summary: 'Send OTP to phone',
  description: 'Send a verification code to a phone number (requires authentication)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['phone', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP sent successfully' },
    401: { description: 'Unauthorized' },
    500: { description: 'Internal server error' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/otp/verify-phone',
  tags: ['OTP'],
  summary: 'Verify phone OTP',
  description: 'Verify an OTP code sent to phone (requires authentication)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              code: { type: 'string', pattern: '^\\d{6}$' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['phone', 'code', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP verified successfully' },
    400: { description: 'Invalid or expired OTP' },
    401: { description: 'Unauthorized' },
    500: { description: 'Internal server error' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/otp/resend-phone',
  tags: ['OTP'],
  summary: 'Resend phone OTP',
  description: 'Resend verification code to phone (requires authentication)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              purpose: { type: 'string', enum: ['REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION'] },
            },
            required: ['phone', 'purpose'],
          },
        },
      },
    },
  },
  responses: {
    200: { description: 'OTP resent successfully' },
    401: { description: 'Unauthorized' },
    500: { description: 'Internal server error' },
  },
});

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
