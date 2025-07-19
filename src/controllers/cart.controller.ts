/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  addToCart,
  updateCartItem,
  removeFromCart,
  getCart,
  clearCart,
  AddToCartSchema,
  UpdateCartItemSchema,
} from '../services/cart.service';

/**
 * Add item to cart
 */
export async function addItemToCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const body = AddToCartSchema.parse(req.body);

    const item = await addToCart(userId, body);

    res.json({
      message: 'Item added to cart successfully',
      item,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to add item to cart',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.params;
    const body = UpdateCartItemSchema.parse(req.body);

    const item = await updateCartItem(userId, productId, body);

    res.json({
      message: 'Cart item updated successfully',
      item,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to update cart item',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Remove item from cart
 */
export async function removeItemFromCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.params;

    await removeFromCart(userId, { productId });

    res.json({
      message: 'Item removed from cart successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to remove item from cart',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Get user's cart
 */
export async function getUserCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    const cart = await getCart(userId);

    res.json(cart);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get cart',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Clear user's cart
 */
export async function clearUserCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    await clearCart(userId);

    res.json({
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to clear cart',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
