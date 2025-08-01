import { z } from 'zod';
import { PaginationQuery } from './common';

// Payment schemas
export const InitializePaymentBody = z.object({
  orderId: z.string().min(1),
  email: z.string().email(),
  amount: z.number().positive(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const VerifyPaymentBody = z.object({
  reference: z.string().min(1),
});

export const RefundPaymentBody = z.object({
  reason: z.string().min(1),
});

export const PaymentHistoryQuery = PaginationQuery;

export const PaymentIdParam = z.object({
  paymentId: z.string().describe('Payment ID'),
});

export const PaymentResponse = z.object({
  authorizationUrl: z.string(),
  reference: z.string(),
});

export const PaymentVerificationResponse = z.object({
  status: z.string(),
  order: z.any(),
  payment: z.any(),
});

export const PaymentHistoryResponse = z.object({
  payments: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const PaymentDetailsResponse = z.object({
  payment: z.any(),
});

export const RefundResponse = z.object({
  message: z.string(),
  payment: z.any(),
});

export const WebhookResponse = z.object({
  message: z.string(),
});
