import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller';
import { registry } from '../lib/openapi';
import { StoreSlugParam } from '../schema';

// OpenAPI registration for analytics endpoints
registry.registerPath({
  method: 'get',
  path: '/analytics/best-sellers',
  tags: ['analytics'],
  responses: {
    200: {
      description: 'Global best-selling products',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    imageUrl: { type: 'string' },
                    store: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                    salesData: {
                      type: 'object',
                      properties: {
                        totalSold: { type: 'number' },
                        totalRevenue: { type: 'number' },
                        averagePrice: { type: 'number' },
                      },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
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
  path: '/analytics/stores/{slug}/best-sellers',
  tags: ['analytics'],
  request: {
    params: StoreSlugParam,
  },
  responses: {
    200: {
      description: 'Store-specific best-selling products',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              store: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              period: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    imageUrl: { type: 'string' },
                    salesData: {
                      type: 'object',
                      properties: {
                        totalSold: { type: 'number' },
                        totalRevenue: { type: 'number' },
                        averagePrice: { type: 'number' },
                      },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    404: {
      description: 'Store not found',
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
  path: '/analytics/featured',
  tags: ['analytics'],
  responses: {
    200: {
      description: 'Featured products (best sellers from last 30 days)',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    imageUrl: { type: 'string' },
                    store: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                    salesData: {
                      type: 'object',
                      properties: {
                        totalSold: { type: 'number' },
                        totalRevenue: { type: 'number' },
                        averagePrice: { type: 'number' },
                      },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  period: { type: 'string' },
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

// Analytics routes (public endpoints)
r.get('/best-sellers', analytics.getGlobalBestSellers);
r.get('/stores/:slug/best-sellers', analytics.getStoreBestSellers);
r.get('/featured', analytics.getFeaturedProducts);

export default r;
