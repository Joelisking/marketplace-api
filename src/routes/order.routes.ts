import { Router } from 'express';
import * as ctrl from '../controllers/order.controller';
import { authGuard, requireVendor } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import * as schema from '../schema';

// OpenAPI registration for order endpoints
registry.registerPath({
  method: 'post',
  path: '/orders',
  tags: ['orders'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              storeId: { type: 'string' },
              shippingAddress: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postalCode: { type: 'string' },
                  country: { type: 'string' },
                },
                required: ['street', 'city', 'state', 'postalCode'],
              },
              billingAddress: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postalCode: { type: 'string' },
                  country: { type: 'string' },
                },
              },
              notes: { type: 'string' },
            },
            required: ['storeId', 'shippingAddress'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Order created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              order: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  paymentStatus: { type: 'string' },
                  total: { type: 'number' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        productId: { type: 'string' },
                        quantity: { type: 'number' },
                        price: { type: 'number' },
                        total: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/orders',
  tags: ['orders'],
  security: [{ bearerAuth: [] }],
  request: {
    query: schema.OrderListQuery,
  },
  responses: {
    200: {
      description: 'Orders retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              orders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    paymentStatus: { type: 'string' },
                    total: { type: 'number' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/orders/{orderId}',
  tags: ['orders'],
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.OrderIdParam,
  },
  responses: {
    200: {
      description: 'Order details retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              order: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  paymentStatus: { type: 'string' },
                  total: { type: 'number' },
                  subtotal: { type: 'number' },
                  tax: { type: 'number' },
                  shipping: { type: 'number' },
                  currency: { type: 'string' },
                  createdAt: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        productId: { type: 'string' },
                        quantity: { type: 'number' },
                        price: { type: 'number' },
                        total: { type: 'number' },
                        product: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            imageUrl: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/vendor/orders/{orderId}/status',
  tags: ['vendor-orders'],
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.OrderIdParam,
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['status'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Order status updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              order: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/vendor/orders',
  tags: ['vendor-orders'],
  security: [{ bearerAuth: [] }],
  request: {
    query: schema.OrderListQuery,
  },
  responses: {
    200: {
      description: 'Vendor orders retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              orders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    paymentStatus: { type: 'string' },
                    total: { type: 'number' },
                    customer: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                      },
                    },
                    createdAt: { type: 'string' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/vendor/orders/stats',
  tags: ['vendor-orders'],
  security: [{ bearerAuth: [] }],
  request: {
    query: schema.OrderStatsQuery,
  },
  responses: {
    200: {
      description: 'Vendor order statistics retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              totalOrders: { type: 'number' },
              totalRevenue: { type: 'number' },
              byStatus: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    count: { type: 'number' },
                    revenue: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/orders/{orderId}',
  tags: ['orders'],
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.OrderIdParam,
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              reason: { type: 'string' },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Order cancelled successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              order: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  cancelledAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
});

const r = Router();

// Customer order routes
r.post('/orders', authGuard, ctrl.checkoutOrder);
r.get('/orders', authGuard, ctrl.getCustomerOrderHistory);
r.get('/orders/:orderId', authGuard, ctrl.getOrderDetails);
r.delete('/orders/:orderId', authGuard, ctrl.cancelCustomerOrder);

// Vendor order routes
r.get('/vendor/orders', authGuard, requireVendor, ctrl.getVendorOrderList);
r.get('/vendor/orders/:orderId', authGuard, requireVendor, ctrl.getVendorOrderDetails);
r.patch('/vendor/orders/:orderId/status', authGuard, requireVendor, ctrl.updateVendorOrderStatus);
r.get('/vendor/orders/stats', authGuard, requireVendor, ctrl.getVendorOrderStatistics);

export default r;
