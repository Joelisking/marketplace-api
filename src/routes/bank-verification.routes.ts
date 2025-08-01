import { Router } from 'express';
import {
  getBanks,
  verifyAccount,
  getBank,
  searchBanksController,
} from '../controllers/bank-verification.controller';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';

const router = Router();

// Bank verification routes
router.get('/banks', authGuard, getBanks);
router.post('/banks/verify', authGuard, verifyAccount);
router.get('/banks/:bankCode', authGuard, getBank);
router.get('/banks/search', authGuard, searchBanksController);

// OpenAPI registration for bank verification endpoints
registry.registerPath({
  method: 'get',
  path: '/bank-verification/banks',
  tags: ['bank-verification'],
  summary: 'Get list of banks',
  description: 'Retrieve a list of all available banks from Paystack',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'country',
      in: 'query',
      description: 'Country code (default: nigeria)',
      schema: { type: 'string', default: 'nigeria' },
    },
    {
      name: 'perPage',
      in: 'query',
      description: 'Number of banks per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
    {
      name: 'active',
      in: 'query',
      description: 'Filter by active status',
      schema: { type: 'boolean', default: true },
    },
  ],
  responses: {
    200: {
      description: 'Banks retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              banks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    code: { type: 'string' },
                    longcode: { type: 'string' },
                    gateway: { type: 'string', nullable: true },
                    pay_with_bank: { type: 'boolean' },
                    active: { type: 'boolean' },
                    country: { type: 'string' },
                    currency: { type: 'string' },
                    type: { type: 'string' },
                    is_deleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
    },
    500: {
      description: 'Internal server error',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/bank-verification/banks/verify',
  tags: ['bank-verification'],
  summary: 'Verify bank account number',
  description: 'Verify a bank account number using Paystack API',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              accountNumber: {
                type: 'string',
                minLength: 1,
                maxLength: 20,
                description: 'Bank account number (various lengths supported)',
              },
              bankCode: {
                type: 'string',
                minLength: 3,
                maxLength: 10,
                description: 'Bank code from the bank list',
              },
            },
            required: ['accountNumber', 'bankCode'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bank account verified successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              verification: {
                type: 'object',
                properties: {
                  account_number: { type: 'string' },
                  account_name: { type: 'string' },
                  bank_id: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid account number or bank code',
    },
    401: {
      description: 'Unauthorized - Authentication required',
    },
    500: {
      description: 'Internal server error',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/bank-verification/banks/{bankCode}',
  tags: ['bank-verification'],
  summary: 'Get bank by code',
  description: 'Retrieve bank details by bank code',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'bankCode',
      in: 'path',
      required: true,
      description: 'Bank code',
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: {
      description: 'Bank retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              bank: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  code: { type: 'string' },
                  longcode: { type: 'string' },
                  gateway: { type: 'string', nullable: true },
                  pay_with_bank: { type: 'boolean' },
                  active: { type: 'boolean' },
                  country: { type: 'string' },
                  currency: { type: 'string' },
                  type: { type: 'string' },
                  is_deleted: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
    },
    404: {
      description: 'Bank not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/bank-verification/banks/search',
  tags: ['bank-verification'],
  summary: 'Search banks',
  description: 'Search banks by name or code',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'search',
      in: 'query',
      required: true,
      description: 'Search term (bank name or code)',
      schema: { type: 'string', minLength: 2 },
    },
  ],
  responses: {
    200: {
      description: 'Banks search completed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              banks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    code: { type: 'string' },
                    longcode: { type: 'string' },
                    gateway: { type: 'string', nullable: true },
                    pay_with_bank: { type: 'boolean' },
                    active: { type: 'boolean' },
                    country: { type: 'string' },
                    currency: { type: 'string' },
                    type: { type: 'string' },
                    is_deleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Search term is required',
    },
    401: {
      description: 'Unauthorized - Authentication required',
    },
    500: {
      description: 'Internal server error',
    },
  },
});

export default router;
