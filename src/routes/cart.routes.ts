import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/cart.controller';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import * as schema from '../schema';

// OpenAPI registration for cart endpoints
registry.registerPath({
  method: 'post',
  path: '/cart/items',
  tags: ['cart'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: schema.AddToCartBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item added to cart successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            item: schema.CartItemResponse,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/cart/items/{productId}',
  tags: ['cart'],
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.CartItemIdParam,
    body: {
      content: {
        'application/json': {
          schema: schema.UpdateCartItemBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Cart item updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            item: schema.CartItemResponse,
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/cart/items/{productId}',
  tags: ['cart'],
  security: [{ bearerAuth: [] }],
  request: {
    params: schema.CartItemIdParam,
  },
  responses: {
    200: {
      description: 'Item removed from cart successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/cart',
  tags: ['cart'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Cart retrieved successfully',
      content: {
        'application/json': {
          schema: schema.CartSummaryResponse,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/cart',
  tags: ['cart'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Cart cleared successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

const r = Router();

// Cart routes (all require authentication)
r.post('/cart/items', authGuard, ctrl.addItemToCart);
r.put('/cart/items/:productId', authGuard, ctrl.updateCartItemQuantity);
r.delete('/cart/items/:productId', authGuard, ctrl.removeItemFromCart);
r.get('/cart', authGuard, ctrl.getUserCart);
r.delete('/cart', authGuard, ctrl.clearUserCart);

export default r;
