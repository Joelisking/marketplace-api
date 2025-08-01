/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/payment.service.ts

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { sendPaymentNotification } from './notification.service';

const prisma = new PrismaClient();

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PLATFORM_SUBACCOUNT_CODE = process.env.PAYSTACK_PLATFORM_SUBACCOUNT_CODE;

// Paystack API response types
interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackSubaccount {
  id: number;
  subaccount_code: string;
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaystackSplit {
  id: number;
  split_code: string;
  name: string;
  type: string;
  currency: string;
  subaccounts: Array<{ subaccount: string; share: number }>;
  bearer_type: string;
  created_at: string;
  updated_at: string;
}

interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  authorization_url?: string;
  created_at: string;
  updated_at: string;
}

interface PaystackRefund {
  id: number;
  transaction: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

// Webhook signature verification
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('Webhook secret not configured');
    return false;
  }
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}

// Create a Paystack subaccount for a vendor
export async function createVendorSubaccount(
  vendorId: string,
  storeId: string,
  businessName: string,
  bankCode: string,
  accountNumber: string,
  platformCommission = 5,
): Promise<{ subaccountCode: string; accountId: string; status: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      percentage_charge: platformCommission,
      description: `Vendor account for ${businessName}`,
      metadata: { vendorId, storeId },
    }),
  });
  const result = (await res.json()) as PaystackResponse<PaystackSubaccount>;
  if (!result.status) throw new Error(result.message);

  // Persist subaccount code
  await prisma.store.update({
    where: { id: storeId },
    data: { paystackAccountCode: result.data.subaccount_code, paystackAccountActive: true },
  });

  return {
    subaccountCode: result.data.subaccount_code,
    accountId: String(result.data.id),
    status: result.data.active ? 'active' : 'inactive',
  };
}

// Build a split and register it with Paystack
export async function createMultiSplit(
  orderId: string,
  vendorSplits: Array<{ subaccountCode: string; share: number }>,
): Promise<{ splitCode: string }> {
  if (!PLATFORM_SUBACCOUNT_CODE) {
    throw new Error('Missing PLATFORM_SUBACCOUNT_CODE in environment');
  }

  const totalVendorShare = vendorSplits.reduce((sum, s) => sum + s.share, 0);
  if (totalVendorShare > 100) throw new Error('Vendor shares exceed 100%');
  const platformShare = 100 - totalVendorShare;

  const subaccounts = vendorSplits
    .map(({ subaccountCode, share }) => ({ subaccount: subaccountCode, share }))
    .concat({ subaccount: PLATFORM_SUBACCOUNT_CODE, share: platformShare });

  const res = await fetch(`${PAYSTACK_BASE_URL}/split`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Order-${orderId}-split`,
      type: 'percentage',
      currency: 'GHS',
      subaccounts,
      bearer_type: 'account',
    }),
  });
  const data = (await res.json()) as PaystackResponse<PaystackSplit>;
  if (!data.status) throw new Error(data.message);
  return { splitCode: data.data.split_code };
}

// Figure out each vendor’s share for an order
export async function calculatePaymentSplit(orderId: string): Promise<{
  splits: Array<{ subaccountCode: string; share: number; amount: number }>;
  total: number;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { store: true } } } } },
  });
  if (!order) throw new Error('Order not found');

  const map = new Map<string, { subtotal: number; subaccountCode: string }>();
  order.items.forEach((item) => {
    const code = item.product.store.paystackAccountCode!;
    const entry = map.get(code) || { subaccountCode: code, subtotal: 0 };
    entry.subtotal += item.price * item.quantity;
    map.set(code, entry);
  });

  const splits = Array.from(map.values()).map(({ subaccountCode, subtotal }) => ({
    subaccountCode,
    amount: subtotal,
    share: Math.round((subtotal / order.total) * 100),
  }));

  return { splits, total: order.total };
}

// Kick off a Paystack transaction
export async function initializePayment(
  userId: string,
  {
    orderId,
    email,
    amount,
    callbackUrl,
  }: { orderId: string; email: string; amount: number; callbackUrl?: string },
): Promise<{ authorizationUrl: string; reference: string }> {
  const reference = `ORDER_${orderId}_${Date.now()}`;
  const { splits } = await calculatePaymentSplit(orderId);
  const { splitCode } = await createMultiSplit(
    orderId,
    splits.map((s) => ({ subaccountCode: s.subaccountCode, share: s.share })),
  );

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      split_code: splitCode,
      callback_url: callbackUrl,
    }),
  });
  const data = (await res.json()) as PaystackResponse<PaystackTransaction>;
  if (!data.status) throw new Error(data.message);

  // Optionally persist a payment record here…

  return { authorizationUrl: data.data.authorization_url!, reference };
}

// Verify a completed transaction
export async function verifyPayment(
  userId: string,
  { reference }: { reference: string },
): Promise<{ status: string; order: any; payment: any }> {
  const payment = await prisma.payment.findFirst({
    where: { reference, order: { customerId: userId } },
    include: { order: true },
  });
  if (!payment) throw new Error('Payment not found');

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const result = (await res.json()) as PaystackResponse<PaystackTransaction>;
  if (!result.status) throw new Error(result.message);

  const success = result.data.status === 'success';
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: success ? 'PAID' : 'FAILED', providerData: result.data as any },
  });
  const updatedOrder = await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: success ? 'PAID' : 'FAILED',
      paymentReference: reference,
      paymentData: result.data as any,
    },
  });

  return { status: updatedPayment.status, order: updatedOrder, payment: updatedPayment };
}

// List a user’s payment history
export async function getPaymentHistory(
  userId: string,
  page = 1,
  limit = 10,
): Promise<{
  payments: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { order: { customerId: userId } },
      include: { order: { select: { id: true, status: true, total: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where: { order: { customerId: userId } } }),
  ]);
  return { payments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Get details for a single payment
export async function getPaymentDetails(paymentId: string, userId: string): Promise<any> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, order: { customerId: userId } },
    include: { order: { include: { items: { include: { product: true } } } } },
  });
  if (!payment) throw new Error('Payment not found');
  return payment;
}

// Issue a refund
export async function refundPayment(
  paymentId: string,
  userId: string,
  reason: string,
): Promise<any> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, order: { customerId: userId }, status: 'PAID' },
  });
  if (!payment) throw new Error('Payment not found or not eligible for refund');

  const res = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transaction: payment.reference, reason }),
  });
  const result = (await res.json()) as PaystackResponse<PaystackRefund>;
  if (!result.status) throw new Error(result.message);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      providerData: { ...(payment.providerData as any), refund: result.data },
    },
  });
  await prisma.order.update({
    where: { id: payment.orderId },
    data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
  });
  return updated;
}

// Handle incoming Paystack webhooks
export async function handleWebhookEvent(payload: any): Promise<void> {
  if (payload.event !== 'charge.success') return;
  const payment = await prisma.payment.findFirst({ where: { reference: payload.data.reference } });
  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PAID', providerData: payload.data },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { paymentStatus: 'PAID', status: 'PROCESSING' },
  });

  // Send payment notification
  try {
    await sendPaymentNotification(payment.orderId, 'PAID', payment.amount);
  } catch (error) {
    console.error('Failed to send payment notification:', error);
    // Don't fail the webhook if notification fails
  }

  // Process vendor payouts after successful payment
  try {
    const { processVendorPayouts } = await import('./vendor-payment.service');
    await processVendorPayouts(payment.orderId);
  } catch (error) {
    console.error('Failed to process vendor payouts:', error);
    // Don't fail the webhook if payout processing fails
  }
}
