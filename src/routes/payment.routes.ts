/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import * as schema from '../schema';
import {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentDetails,
  refundPayment,
  handleWebhookEvent,
  verifyWebhookSignature,
} from '../services/payment.service';

const router = Router();

// Zod schemas
const InitializePaymentBody = z.object({
  orderId: z.string().min(1),
  email: z.string().email(),
  amount: z.number().positive(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const VerifyPaymentBody = z.object({ reference: z.string().min(1) });
const RefundPaymentBody = z.object({ reason: z.string().min(1) });

// Initialize payment
registry.registerPath({
  method: 'post',
  path: '/payments/initialize',
  tags: ['payment'],
  summary: 'Initialize Paystack payment',
  description: 'Initialize a new payment with Paystack for an order',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: schema.InitializePaymentBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment initialized successfully',
      content: {
        'application/json': {
          schema: schema.PaymentResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.post('/payments/initialize', authGuard, async (req, res) => {
  try {
    const body = InitializePaymentBody.parse(req.body);
    const userId = (req as any).user.id;
    const result = await initializePayment(userId, body);
    res.json(result);
  } catch (err) {
    console.error('Initialization error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Verify payment
registry.registerPath({
  method: 'post',
  path: '/payments/verify',
  tags: ['payment'],
  summary: 'Verify payment status',
  description: 'Verify the status of a payment using the reference',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: schema.VerifyPaymentBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment verified successfully',
      content: {
        'application/json': {
          schema: schema.PaymentVerificationResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.post('/payments/verify', authGuard, async (req, res) => {
  try {
    const { reference } = VerifyPaymentBody.parse(req.body);
    const userId = (req as any).user.id;
    const result = await verifyPayment(userId, { reference });
    res.json(result);
  } catch (err) {
    console.error('Verification error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Payment history
registry.registerPath({
  method: 'get',
  path: '/payments/history',
  tags: ['payment'],
  summary: 'Get payment history',
  description: 'Get the payment history for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    query: schema.PaymentHistoryQuery,
  },
  responses: {
    200: {
      description: 'Payment history retrieved successfully',
      content: {
        'application/json': {
          schema: schema.PaymentHistoryResponse,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.get('/payments/history', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await getPaymentHistory(userId, page, limit);
    res.json(result);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payment details
registry.registerPath({
  method: 'get',
  path: '/payments/{paymentId}',
  tags: ['payment'],
  summary: 'Get payment details',
  description: 'Get detailed information about a specific payment',
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.PaymentIdParam,
  },
  responses: {
    200: {
      description: 'Payment details retrieved successfully',
      content: {
        'application/json': {
          schema: schema.PaymentDetailsResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.get('/payments/:paymentId', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { paymentId } = req.params;
    const payment = await getPaymentDetails(paymentId, userId);
    res.json({ payment });
  } catch (err) {
    console.error('Details error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Refund payment
registry.registerPath({
  method: 'post',
  path: '/payments/{paymentId}/refund',
  tags: ['payment'],
  summary: 'Refund payment',
  description: 'Process a refund for a payment',
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.PaymentIdParam,
    body: {
      content: {
        'application/json': {
          schema: schema.RefundPaymentBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Refund processed successfully',
      content: {
        'application/json': {
          schema: schema.RefundResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.post('/payments/:paymentId/refund', authGuard, async (req, res) => {
  try {
    const { reason } = RefundPaymentBody.parse(req.body);
    const userId = (req as any).user.id;
    const { paymentId } = req.params;
    const result = await refundPayment(paymentId, userId, reason);
    res.json({ message: 'Refund successful', payment: result });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Webhook
registry.registerPath({
  method: 'post',
  path: '/payments/webhook',
  tags: ['payment'],
  summary: 'Paystack webhook handler',
  description: 'Handle Paystack webhook events for payment updates',
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            description: 'Paystack webhook payload',
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: schema.WebhookResponse,
        },
      },
    },
    401: {
      description: 'Invalid signature',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

router.post('/payments/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-paystack-signature'] as string;
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(JSON.stringify(payload), signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    await handleWebhookEvent(payload);
    res.json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
