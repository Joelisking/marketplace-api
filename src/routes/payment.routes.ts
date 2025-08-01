/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middlewares/auth';
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
