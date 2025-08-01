/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fetch from 'node-fetch';
import { URL } from 'url';

const prisma = new PrismaClient();

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  throw new Error('Missing PAYSTACK_SECRET_KEY environment variable');
}

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

interface PaystackSettlement {
  id: number;
  domain: string;
  amount: number;
  currency: string;
  source: string;
  reason: string;
  recipient: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const CreateVendorAccountSchema = z.object({
  vendorId: z.string(),
  storeId: z.string(),
  businessName: z.string(),
  accountNumber: z.string().regex(/^\d+$/, 'Account number must be numeric'),
  bankCode: z.string(),
  percentageCharge: z.number().min(0).max(100).optional(),
});

export const UpdateVendorAccountSchema = z.object({
  businessName: z.string().optional(),
  accountNumber: z.string().regex(/^\d+$/, 'Account number must be numeric').optional(),
  bankCode: z.string().optional(),
  percentageCharge: z.number().min(0).max(100).optional(),
});

export type CreateVendorAccountRequest = z.infer<typeof CreateVendorAccountSchema>;
export type UpdateVendorAccountRequest = z.infer<typeof UpdateVendorAccountSchema>;

/**
 * Create a Paystack subaccount for a vendor
 */
export async function createVendorPaystackAccount(
  request: CreateVendorAccountRequest,
): Promise<{ accountCode: string; accountId: string; status: string }> {
  const {
    vendorId,
    storeId,
    businessName,
    accountNumber,
    bankCode,
    percentageCharge = 5,
  } = CreateVendorAccountSchema.parse(request);

  // Verify store belongs to vendor
  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      owner: { id: vendorId },
    },
  });
  if (!store) {
    throw new Error('Store not found or does not belong to vendor');
  }

  // Create subaccount via Paystack
  const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
      description: `Vendor account for ${businessName}`,
      metadata: { vendorId, storeId },
    }),
  });

  const result = (await response.json()) as PaystackResponse<PaystackSubaccount>;
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message}`);
  }

  const { subaccount_code, id, active } = result.data;

  // Persist subaccount code in database
  await prisma.store.update({
    where: { id: storeId },
    data: { paystackAccountCode: subaccount_code, paystackAccountActive: true },
  });

  return {
    accountCode: subaccount_code,
    accountId: String(id),
    status: active ? 'active' : 'inactive',
  };
}

/**
 * Update a vendor's Paystack subaccount
 */
export async function updateVendorPaystackAccount(
  accountCode: string,
  request: UpdateVendorAccountRequest,
): Promise<{ accountCode: string; status: string }> {
  const updateData = UpdateVendorAccountSchema.parse(request);
  const payload: Record<string, any> = {};
  if (updateData.businessName) payload.business_name = updateData.businessName;
  if (updateData.accountNumber) payload.account_number = updateData.accountNumber;
  if (updateData.bankCode) payload.bank_code = updateData.bankCode;
  if (updateData.percentageCharge !== undefined)
    payload.percentage_charge = updateData.percentageCharge;

  const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount/${accountCode}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as PaystackResponse<PaystackSubaccount>;
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message}`);
  }

  return {
    accountCode: result.data.subaccount_code,
    status: result.data.active ? 'active' : 'inactive',
  };
}

/**
 * Fetch details for a vendor's Paystack subaccount
 */
export async function getVendorPaystackAccount(accountCode: string): Promise<PaystackSubaccount> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount/${accountCode}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const result = (await response.json()) as PaystackResponse<PaystackSubaccount>;
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message}`);
  }

  return result.data;
}

/**
 * List all Paystack subaccounts (admin only)
 */
export async function listVendorPaystackAccounts(): Promise<PaystackSubaccount[]> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const result = (await response.json()) as PaystackResponse<PaystackSubaccount[]>;
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message}`);
  }

  return result.data;
}

/**
 * Retrieve settlement payouts for a vendor subaccount
 */
export async function getVendorSettlements(
  accountCode: string,
  page: number = 1,
  perPage: number = 10,
): Promise<{
  settlements: PaystackSettlement[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}> {
  const url = new URL(`${PAYSTACK_BASE_URL}/settlement`);
  url.searchParams.append('subaccount', accountCode);
  url.searchParams.append('page', String(page));
  url.searchParams.append('perPage', String(perPage));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const result = (await response.json()) as PaystackResponse<PaystackSettlement[]> & {
    meta: { total: number };
  };
  if (!result.status) {
    throw new Error(`Paystack error: ${result.message}`);
  }

  return {
    settlements: result.data,
    pagination: {
      page,
      perPage,
      total: result.meta.total,
      totalPages: Math.ceil(result.meta.total / perPage),
    },
  };
}

/**
 * Process vendor payouts for completed orders
 * This function handles the automatic disbursement of funds to vendors
 */
export async function processVendorPayouts(orderId: string): Promise<{
  success: boolean;
  message: string;
  payouts: Array<{ vendorId: string; storeId: string; amount: number; status: string }>;
}> {
  try {
    // Get order with items and store information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  include: {
                    owner: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus !== 'PAID') {
      throw new Error('Order payment not completed');
    }

    // Group items by vendor/store
    const vendorGroups = new Map<
      string,
      {
        vendorId: string;
        storeId: string;
        storeName: string;
        items: Array<{ productId: string; quantity: number; price: number; total: number }>;
        subtotal: number;
      }
    >();

    order.items.forEach((item) => {
      const store = item.product.store;
      const vendorId = store.vendorId || store.owner?.id;

      if (!vendorId) {
        throw new Error(`Store ${store.id} has no associated vendor`);
      }

      if (!store.paystackAccountCode) {
        throw new Error(`Store ${store.id} has no Paystack account configured`);
      }

      const key = `${vendorId}-${store.id}`;
      const existing = vendorGroups.get(key) || {
        vendorId,
        storeId: store.id,
        storeName: store.name,
        items: [],
        subtotal: 0,
      };

      existing.items.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      });
      existing.subtotal += item.total;
      vendorGroups.set(key, existing);
    });

    const payouts: Array<{ vendorId: string; storeId: string; amount: number; status: string }> =
      [];

    // Process payouts for each vendor
    for (const [, vendorGroup] of vendorGroups) {
      try {
        // Calculate platform fee (5% by default)
        const platformFee = Math.round(vendorGroup.subtotal * 0.05);
        const vendorAmount = vendorGroup.subtotal - platformFee;

        // Create payout record in database
        const payout = await prisma.vendorPayout.create({
          data: {
            vendorId: vendorGroup.vendorId,
            storeId: vendorGroup.storeId,
            orderId: orderId,
            amount: vendorAmount,
            platformFee,
            totalAmount: vendorGroup.subtotal,
            status: 'PENDING',
            paystackAccountCode:
              order.items.find((item) => item.product.store.id === vendorGroup.storeId)?.product
                .store.paystackAccountCode || '',
            metadata: {
              items: vendorGroup.items,
              orderReference: order.paymentReference,
            },
          },
        });

        // Trigger Paystack settlement (this happens automatically with split payments)
        // The actual settlement is handled by Paystack's split payment system
        // We just need to track it in our database

        payouts.push({
          vendorId: vendorGroup.vendorId,
          storeId: vendorGroup.storeId,
          amount: vendorAmount,
          status: 'PROCESSING',
        });

        // Update payout status to processing
        await prisma.vendorPayout.update({
          where: { id: payout.id },
          data: { status: 'PROCESSING' },
        });
      } catch (error) {
        console.error(`Failed to process payout for vendor ${vendorGroup.vendorId}:`, error);
        payouts.push({
          vendorId: vendorGroup.vendorId,
          storeId: vendorGroup.storeId,
          amount: 0,
          status: 'FAILED',
        });
      }
    }

    // Create order event for vendor payouts
    await prisma.orderEvent.create({
      data: {
        orderId: orderId,
        eventType: 'VENDOR_PAYOUTS_PROCESSED',
        description: `Vendor payouts processed for ${payouts.length} vendors`,
        metadata: { payouts },
      },
    });

    return {
      success: true,
      message: `Successfully processed payouts for ${payouts.length} vendors`,
      payouts,
    };
  } catch (error) {
    console.error('Error processing vendor payouts:', error);
    return {
      success: false,
      message: (error as Error).message,
      payouts: [],
    };
  }
}

/**
 * Get vendor earnings summary
 */
export async function getVendorEarnings(
  vendorId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalEarnings: number;
  totalPayouts: number;
  pendingPayouts: number;
  platformFees: number;
  payouts: Array<{
    id: string;
    orderId: string;
    amount: number;
    platformFee: number;
    status: string;
    createdAt: Date;
  }>;
}> {
  const whereClause: any = { vendorId };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const payouts = await prisma.vendorPayout.findMany({
    where: whereClause,
    select: {
      id: true,
      orderId: true,
      amount: true,
      platformFee: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalEarnings = payouts.reduce((sum: number, p: any) => sum + p.amount + p.platformFee, 0);
  const totalPayouts = payouts
    .filter((p: any) => p.status === 'COMPLETED')
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const pendingPayouts = payouts
    .filter((p: any) => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const platformFees = payouts.reduce((sum: number, p: any) => sum + p.platformFee, 0);

  return {
    totalEarnings,
    totalPayouts,
    pendingPayouts,
    platformFees,
    payouts,
  };
}

/**
 * Get vendor payout history
 */
export async function getVendorPayoutHistory(
  vendorId: string,
  page: number = 1,
  perPage: number = 10,
): Promise<{
  payouts: Array<{
    id: string;
    orderId: string;
    storeId: string;
    amount: number;
    platformFee: number;
    status: string;
    createdAt: Date;
    order: { paymentReference: string | null; total: number };
  }>;
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}> {
  const skip = (page - 1) * perPage;

  const [payouts, total] = await Promise.all([
    prisma.vendorPayout.findMany({
      where: { vendorId },
      include: {
        order: {
          select: {
            paymentReference: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.vendorPayout.count({ where: { vendorId } }),
  ]);

  return {
    payouts,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
