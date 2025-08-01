/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import { getCustomerOrders, getOrderById } from '../services/order.service';
import * as customerDashboard from '../controllers/customer-dashboard.controller';
import { z } from 'zod';
import {
  CustomerOrderQuery,
  CustomerOrderListResponse,
  CustomerOrderDetailsResponse,
  OrderTrackingResponse,
  CustomerStatsResponse,
  ErrorResponse,
  CustomerOrderIdParam,
} from '../schema/customer';

// OpenAPI registration for customer endpoints
registry.registerPath({
  method: 'get',
  path: '/customer/orders',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  request: {
    query: CustomerOrderQuery,
  },
  responses: {
    200: {
      description: 'Customer orders retrieved successfully',
      content: {
        'application/json': {
          schema: CustomerOrderListResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/customer/orders/{orderId}',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  request: {
    params: CustomerOrderIdParam,
  },
  responses: {
    200: {
      description: 'Customer order details retrieved successfully',
      content: {
        'application/json': {
          schema: CustomerOrderDetailsResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
    403: {
      description: 'Access denied - customer can only access their own orders',
    },
    404: {
      description: 'Order not found',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/customer/orders/{orderId}/tracking',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  request: {
    params: CustomerOrderIdParam,
  },
  responses: {
    200: {
      description: 'Order tracking details retrieved successfully',
      content: {
        'application/json': {
          schema: OrderTrackingResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
    403: {
      description: 'Access denied - customer can only access their own orders',
    },
    404: {
      description: 'Order not found',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/customer/stats',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Customer statistics retrieved successfully',
      content: {
        'application/json': {
          schema: CustomerStatsResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

const router = Router();

// Customer order management
router.get('/customer/orders', authGuard, async (req, res) => {
  try {
    const customerId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const result = await getCustomerOrders(customerId, {
      page,
      limit,
      status: status as any,
    });

    res.json({
      message: 'Orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get orders',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
});

router.get('/customer/orders/:orderId', authGuard, async (req, res) => {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;

    const order = await getOrderById(orderId);

    // Ensure customer can only access their own orders
    if (order.customerId !== customerId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    res.json({
      message: 'Order details retrieved successfully',
      data: { order },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get order details',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
});

router.get('/customer/orders/:orderId/tracking', authGuard, async (req, res) => {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;

    // For now, return basic tracking info
    const order = await getOrderById(orderId);

    if (order.customerId !== customerId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    res.json({
      message: 'Order tracking details retrieved successfully',
      data: {
        orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        currentLocation: 'In transit',
        trackingEvents: [
          {
            eventType: 'order_created',
            description: 'Order has been created',
            timestamp: order.createdAt,
          },
        ],
        deliveryUpdates: [
          {
            status: order.status,
            timestamp: order.updatedAt || order.createdAt,
            description: `Order is ${order.status.toLowerCase()}`,
          },
        ],
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get order tracking details',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
});

router.get('/customer/stats', authGuard, async (req, res) => {
  try {
    const customerId = (req as any).user.id;

    // Get basic order stats using existing service
    const orders = await getCustomerOrders(customerId, { page: 1, limit: 100 });

    const totalOrders = orders.pagination.total;
    const totalSpent = orders.orders.reduce((sum: number, order: any) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    res.json({
      message: 'Customer statistics retrieved successfully',
      data: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        ordersThisMonth: orders.orders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          const now = new Date();
          return (
            orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
          );
        }).length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get customer statistics',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
});

// Customer Dashboard OpenAPI documentation
registry.registerPath({
  method: 'get',
  path: '/customer/dashboard',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
    }),
  },
  responses: {
    200: {
      description: 'Customer dashboard statistics retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              totalOrders: { type: 'number' },
              totalSpent: { type: 'number' },
              averageOrderValue: { type: 'number' },
              ordersThisMonth: { type: 'number' },
              spendingThisMonth: { type: 'number' },
              favoriteStores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    storeId: { type: 'string' },
                    storeName: { type: 'string' },
                    orderCount: { type: 'number' },
                    totalSpent: { type: 'number' },
                  },
                },
              },
              recentActivity: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    eventType: { type: 'string' },
                    description: { type: 'string' },
                    timestamp: { type: 'string' },
                    orderId: { type: 'string' },
                    orderTotal: { type: 'number' },
                    storeName: { type: 'string' },
                  },
                },
              },
              orderStatusBreakdown: {
                type: 'object',
                properties: {
                  pending: { type: 'number' },
                  processing: { type: 'number' },
                  shipped: { type: 'number' },
                  delivered: { type: 'number' },
                  cancelled: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
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

registry.registerPath({
  method: 'get',
  path: '/customer/analytics',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      days: z.number().min(1).max(365).default(30),
    }),
  },
  responses: {
    200: {
      description: 'Customer analytics retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              orderTrends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    orderCount: { type: 'number' },
                  },
                },
              },
              spendingTrends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    amount: { type: 'number' },
                  },
                },
              },
              categoryBreakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
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

registry.registerPath({
  method: 'get',
  path: '/customer/preferences',
  tags: ['customer'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Customer preferences retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              spendingPatterns: {
                type: 'object',
                properties: {
                  averageOrderValue: { type: 'number' },
                  preferredOrderDay: { type: 'string' },
                  preferredOrderTime: { type: 'string' },
                  totalSpent: { type: 'number' },
                },
              },
              favoriteProducts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    productName: { type: 'string' },
                    purchaseCount: { type: 'number' },
                    lastPurchased: { type: 'string' },
                  },
                },
              },
              preferredStores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    storeId: { type: 'string' },
                    storeName: { type: 'string' },
                    orderCount: { type: 'number' },
                    totalSpent: { type: 'number' },
                    averageRating: { type: 'number' },
                  },
                },
              },
              shoppingBehavior: {
                type: 'object',
                properties: {
                  mostActiveMonth: { type: 'string' },
                  averageItemsPerOrder: { type: 'number' },
                  preferredCategories: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  returnRate: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
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

// Customer dashboard routes
router.get('/customer/dashboard', authGuard, customerDashboard.getDashboardStats);
router.get('/customer/analytics', authGuard, customerDashboard.getCustomerAnalyticsData);
router.get('/customer/preferences', authGuard, customerDashboard.getCustomerPreferencesData);

export default router;
