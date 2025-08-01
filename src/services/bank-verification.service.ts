/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import fetch from 'node-fetch';

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Paystack API response types
interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
}

interface PaystackAccountVerification {
  account_number: string;
  account_name: string;
  bank_id: number;
}

// Validation schemas
export const BankVerificationSchema = z.object({
  accountNumber: z.string().min(1).max(20), // Allow various account number lengths
  bankCode: z.string().min(3).max(10),
});

export const BankListQuerySchema = z.object({
  country: z.string().optional().default('nigeria'),
  use_cursor: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional()
    .default(false),
  perPage: z
    .union([z.string(), z.number()])
    .transform((val) => parseInt(val as string, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(50),
  pay_with_bank_transfer: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional()
    .default(false),
  pay_with_bank: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional()
    .default(false),
  active: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional()
    .default(true),
  currency: z.string().optional(),
  type: z.string().optional(),
  gateway: z.string().optional(),
});

export type BankVerificationRequest = z.infer<typeof BankVerificationSchema>;
export type BankListQuery = z.infer<typeof BankListQuerySchema>;

/**
 * Get list of banks from Paystack
 */
export async function getBankList(query: Partial<BankListQuery> = {}): Promise<PaystackBank[]> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  // Set appropriate currency based on country if not provided
  let currency = query.currency;
  if (!currency) {
    if (query.country?.toLowerCase() === 'ghana') {
      currency = 'GHS'; // Ghanaian Cedi
    } else {
      currency = 'NGN'; // Default to Nigerian Naira
    }
  }

  const queryParams: string[] = [];

  if (query.country) queryParams.push(`country=${encodeURIComponent(query.country)}`);
  if (query.use_cursor !== undefined) queryParams.push(`use_cursor=${query.use_cursor}`);
  if (query.perPage) queryParams.push(`perPage=${query.perPage}`);
  if (query.pay_with_bank_transfer !== undefined)
    queryParams.push(`pay_with_bank_transfer=${query.pay_with_bank_transfer}`);
  if (query.pay_with_bank !== undefined) queryParams.push(`pay_with_bank=${query.pay_with_bank}`);
  if (query.active !== undefined) queryParams.push(`active=${query.active}`);
  if (currency) queryParams.push(`currency=${encodeURIComponent(currency)}`);
  if (query.type) queryParams.push(`type=${encodeURIComponent(query.type)}`);
  if (query.gateway) queryParams.push(`gateway=${encodeURIComponent(query.gateway)}`);

  const url = `${PAYSTACK_BASE_URL}/bank${queryParams.length > 0 ? '?' + queryParams.join('&') : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Paystack API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as PaystackResponse<PaystackBank[]>;

    if (!result.status) {
      throw new Error(`Paystack error: ${result.message}`);
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching bank list:', error);
    throw new Error('Failed to fetch bank list. Please try again later.');
  }
}

/**
 * Verify bank account number
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<PaystackAccountVerification> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  // Validate input
  const validation = BankVerificationSchema.safeParse({ accountNumber, bankCode });
  if (!validation.success) {
    throw new Error('Invalid account number or bank code format');
  }

  try {
    const url = `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Paystack API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as PaystackResponse<PaystackAccountVerification>;

    if (!result.status) {
      throw new Error(`Paystack error: ${result.message}`);
    }

    return result.data;
  } catch (error) {
    console.error('Error verifying bank account:', error);
    throw new Error(
      'Failed to verify bank account. Please check the account number and bank code.',
    );
  }
}

/**
 * Get bank details by code
 */
export async function getBankByCode(bankCode: string): Promise<PaystackBank | null> {
  try {
    const banks = await getBankList();
    return banks.find((bank) => bank.code === bankCode) || null;
  } catch (error) {
    console.error('Error getting bank by code:', error);
    return null;
  }
}

/**
 * Search banks by name
 */
export async function searchBanks(searchTerm: string): Promise<PaystackBank[]> {
  try {
    const banks = await getBankList();
    const searchLower = searchTerm.toLowerCase();

    return banks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(searchLower) ||
        bank.code.toLowerCase().includes(searchLower),
    );
  } catch (error) {
    console.error('Error searching banks:', error);
    return [];
  }
}
