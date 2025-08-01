import { Router } from 'express';
import { authGuard, requireSuper } from '../middlewares/auth';
import {
  getSystemOverview,
  getVendorOverview,
  getPaymentOverview,
  getVendorDetails,
  getSystemAnalytics,
  SystemOverviewQuery,
  VendorOverviewQuery,
  PaymentOverviewQuery,
} from '../services/super-admin.service';
import { registry } from '../lib/openapi';

const router = Router();

// OpenAPI registration for super admin endpoints
registry.registerPath({
  method: 'get',
  path: '/super/system/overview',
  tags: ['super-admin'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'startDate',
      in: 'query',
      schema: { type: 'string', format: 'date' },
      description: 'Start date for overview (ISO format)',
    },
    {
      name: 'endDate',
      in: 'query',
      schema: { type: 'string', format: 'date' },
      description: 'End date for overview (ISO format)',
    },
  ],
  responses: {
    200: {
      description: 'System overview data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              overview: {
                type: 'object',
                properties: {
                  totalUsers: { type: 'number' },
                  totalVendors: { type: 'number' },
                  totalStores: { type: 'number' },
                  totalProducts: { type: 'number' },
                  totalOrders: { type: 'number' },
                  totalRevenue: { type: 'number' },
                  totalPayouts: { type: 'number' },
                  period: {
                    type: 'object',
                    properties: {
                      startDate: { type: 'string', format: 'date-time' },
                      endDate: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
              recentActivity: {
                type: 'object',
                properties: {
                  users: { type: 'array', items: { type: 'object' } },
                  orders: { type: 'array', items: { type: 'object' } },
                },
              },
              systemHealth: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  activeStores: { type: 'number' },
                  lowStockProducts: { type: 'number' },
                  pendingPayouts: { type: 'number' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Super admin access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/super/vendors',
  tags: ['super-admin'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'page',
      in: 'query',
      schema: { type: 'number', minimum: 1, default: 1 },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      description: 'Items per page',
    },
    {
      name: 'search',
      in: 'query',
      schema: { type: 'string' },
      description: 'Search vendors by email or store name',
    },
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'all' },
      description: 'Filter by store status',
    },
  ],
  responses: {
    200: {
      description: 'Vendor overview data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              vendors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    storeId: { type: ['string', 'null'] },
                    firstName: { type: ['string', 'null'] },
                    lastName: { type: ['string', 'null'] },
                    phone: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: ['string', 'null'], format: 'date-time' },
                    store: { type: 'object' },
                    stats: { type: 'object' },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  pageSize: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Super admin access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/super/payments/overview',
  tags: ['super-admin'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'startDate',
      in: 'query',
      schema: { type: 'string', format: 'date' },
      description: 'Start date for overview (ISO format)',
    },
    {
      name: 'endDate',
      in: 'query',
      schema: { type: 'string', format: 'date' },
      description: 'End date for overview (ISO format)',
    },
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string', enum: ['all', 'pending', 'completed', 'failed'], default: 'all' },
      description: 'Filter by payout status',
    },
  ],
  responses: {
    200: {
      description: 'Payment overview data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              payouts: { type: 'array', items: { type: 'object' } },
              overview: {
                type: 'object',
                properties: {
                  totalPayouts: { type: 'number' },
                  totalAmount: { type: 'number' },
                  period: { type: 'object' },
                },
              },
              stats: { type: 'object' },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Super admin access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/super/vendors/{vendorId}',
  tags: ['super-admin'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'vendorId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Vendor ID',
    },
  ],
  responses: {
    200: {
      description: 'Vendor details',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              storeId: { type: ['string', 'null'] },
              firstName: { type: ['string', 'null'] },
              lastName: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: ['string', 'null'], format: 'date-time' },
              store: { type: 'object' },
              vendorPayouts: { type: 'array', items: { type: 'object' } },
              stats: { type: 'object' },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Super admin access required' },
    404: { description: 'Vendor not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/super/analytics',
  tags: ['super-admin'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'System analytics data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              userGrowth: { type: 'array', items: { type: 'object' } },
              orderGrowth: { type: 'array', items: { type: 'object' } },
              revenueGrowth: { type: 'array', items: { type: 'object' } },
              topVendors: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Super admin access required' },
  },
});

// System overview endpoint
router.get('/system/overview', authGuard, requireSuper, async (req, res) => {
  try {
    const query = SystemOverviewQuery.parse(req.query);
    const overview = await getSystemOverview(query);
    res.json(overview);
  } catch (err) {
    console.error('System overview error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Vendor overview endpoint
router.get('/vendors', authGuard, requireSuper, async (req, res) => {
  try {
    const query = VendorOverviewQuery.parse(req.query);
    const overview = await getVendorOverview(query);
    res.json(overview);
  } catch (err) {
    console.error('Vendor overview error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Payment overview endpoint
router.get('/payments/overview', authGuard, requireSuper, async (req, res) => {
  try {
    const query = PaymentOverviewQuery.parse(req.query);
    const overview = await getPaymentOverview(query);
    res.json(overview);
  } catch (err) {
    console.error('Payment overview error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// Vendor details endpoint
router.get('/vendors/:vendorId', authGuard, requireSuper, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const details = await getVendorDetails(vendorId);
    res.json(details);
  } catch (err) {
    console.error('Vendor details error:', err);
    if ((err as Error).message === 'Vendor not found') {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

// System analytics endpoint
router.get('/analytics', authGuard, requireSuper, async (req, res) => {
  try {
    const analytics = await getSystemAnalytics();
    res.json(analytics);
  } catch (err) {
    console.error('System analytics error:', err);
    res.status(400).json({ message: (err as Error).message || 'Internal server error' });
  }
});

export default router;
