import { Router } from 'express';
import { z } from 'zod';
import { EnhancedCartService } from '../services/enhanced-cart.service';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';

const enhancedCartService = new EnhancedCartService();

// Sync data schema
const CartSyncDataSchema = z.object({
  localItems: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
      addedAt: z.number(),
    }),
  ),
  lastSync: z.number(),
  userId: z.string().optional(),
});

const SyncLocalCartSchema = z.object({
  localItems: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
    }),
  ),
});

// Enhanced cart response schema
const EnhancedCartResponseSchema = z.object({
  cart: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        productId: z.string(),
        quantity: z.number(),
        createdAt: z.date(),
        updatedAt: z.date().nullable(),
        product: z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          imageUrl: z.string(),
        }),
      }),
    ),
    totalItems: z.number(),
    subtotal: z.number(),
    estimatedTax: z.number(),
    estimatedShipping: z.number(),
    total: z.number(),
  }),
  needsSync: z.boolean(),
  localItemCount: z.number(),
  syncData: CartSyncDataSchema.optional(),
});

// OpenAPI registration for enhanced cart endpoints
registry.registerPath({
  method: 'get',
  path: '/enhanced-cart',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      syncData: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Enhanced cart retrieved successfully',
      content: {
        'application/json': {
          schema: EnhancedCartResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/enhanced-cart/items',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            productId: z.string(),
            quantity: z.number().int().positive().max(100),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item added to enhanced cart successfully',
      content: {
        'application/json': {
          schema: EnhancedCartResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/enhanced-cart/items/{productId}',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      productId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            quantity: z.number().int().positive().max(100),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Enhanced cart item updated successfully',
      content: {
        'application/json': {
          schema: EnhancedCartResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/enhanced-cart/items/{productId}',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      productId: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Item removed from enhanced cart successfully',
      content: {
        'application/json': {
          schema: EnhancedCartResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/enhanced-cart/sync',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SyncLocalCartSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Local cart synced successfully',
      content: {
        'application/json': {
          schema: EnhancedCartResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/enhanced-cart/stats',
  tags: ['Enhanced Cart'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Enhanced cart statistics retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            totalItems: z.number(),
            uniqueProducts: z.number(),
            estimatedTotal: z.number(),
            lastUpdated: z.date(),
          }),
        },
      },
    },
  },
});

const router = Router();

// Enhanced cart routes (all require authentication)
router.get('/enhanced-cart', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    let syncData;
    if (req.query.syncData) {
      try {
        syncData = JSON.parse(req.query.syncData as string);
      } catch (error) {
        console.warn('Invalid sync data format:', error);
      }
    }

    const result = await enhancedCartService.getCart(userId, syncData);
    res.json(result);
  } catch (error) {
    console.error('Error getting enhanced cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/enhanced-cart/items', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { productId, quantity } = req.body;
    const result = await enhancedCartService.addToCart(userId, productId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error adding to enhanced cart:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

router.put('/enhanced-cart/items/:productId', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { productId } = req.params;
    const { quantity } = req.body;
    const result = await enhancedCartService.updateCartItem(userId, productId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error updating enhanced cart item:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

router.delete('/enhanced-cart/items/:productId', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { productId } = req.params;
    const result = await enhancedCartService.removeFromCart(userId, productId);
    res.json(result);
  } catch (error) {
    console.error('Error removing from enhanced cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/enhanced-cart/sync', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const { localItems } = req.body;
    const result = await enhancedCartService.syncLocalCart(userId, localItems);
    res.json(result);
  } catch (error) {
    console.error('Error syncing local cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/enhanced-cart/stats', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const stats = await enhancedCartService.getCartStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting cart stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
