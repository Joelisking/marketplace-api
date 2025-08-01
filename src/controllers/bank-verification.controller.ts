import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error-handler';
import {
  getBankList,
  verifyBankAccount,
  getBankByCode,
  searchBanks,
  BankListQuerySchema,
  BankVerificationSchema,
} from '../services/bank-verification.service';

/**
 * Get list of banks
 */
export const getBanks = asyncHandler(async (req: Request, res: Response) => {
  const query = BankListQuerySchema.parse(req.query);
  const banks = await getBankList(query);

  res.json({
    message: 'Banks retrieved successfully',
    banks,
  });
});

/**
 * Verify bank account number
 */
export const verifyAccount = asyncHandler(async (req: Request, res: Response) => {
  const { accountNumber, bankCode } = BankVerificationSchema.parse(req.body);

  const verification = await verifyBankAccount(accountNumber, bankCode);

  res.json({
    message: 'Bank account verified successfully',
    verification,
  });
});

/**
 * Get bank by code
 */
export const getBank = asyncHandler(async (req: Request, res: Response) => {
  const { bankCode } = req.params;

  const bank = await getBankByCode(bankCode);

  if (!bank) {
    return res.status(404).json({
      message: 'Bank not found',
    });
  }

  res.json({
    message: 'Bank retrieved successfully',
    bank,
  });
});

/**
 * Search banks
 */
export const searchBanksController = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  if (!search || typeof search !== 'string') {
    return res.status(400).json({
      message: 'Search term is required',
    });
  }

  const banks = await searchBanks(search);

  res.json({
    message: 'Banks search completed',
    banks,
  });
});
