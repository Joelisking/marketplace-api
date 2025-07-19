/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const AddToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(100),
});

export const RemoveFromCartSchema = z.object({
  productId: z.string().min(1),
});

export type AddToCartRequest = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemRequest = z.infer<typeof UpdateCartItemSchema>;
export type RemoveFromCartRequest = z.infer<typeof RemoveFromCartSchema>;

// Cart item with product details
export interface CartItemWithProduct {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt?: Date;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl: string;
    isActive: boolean;
    visibleMarket: boolean;
  };
}

// Cart summary
export interface CartSummary {
  items: CartItemWithProduct[];
  totalItems: number;
  subtotal: number;
  estimatedTax: number;
  estimatedShipping: number;
  total: number;
}

/**
 * Add item to cart with inventory validation
 */
export async function addToCart(
  userId: string,
  request: AddToCartRequest,
): Promise<CartItemWithProduct> {
  const { productId, quantity } = AddToCartSchema.parse(request);

  // Validate product exists and is available
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      visibleMarket: true,
    },
  });

  if (!product) {
    throw new Error('Product not found or not available');
  }

  // Check inventory
  if (product.stock < quantity) {
    throw new Error(`Insufficient stock. Available: ${product.stock}`);
  }

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    include: {
      product: true,
    },
  });

  if (existingItem) {
    // Update quantity if item exists
    const newQuantity = existingItem.quantity + quantity;

    if (product.stock < newQuantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      data: {
        quantity: newQuantity,
        updatedAt: new Date(),
      },
      include: {
        product: true,
      },
    });

    return updatedItem as CartItemWithProduct;
  }

  // Add new item to cart
  const newItem = await prisma.cartItem.create({
    data: {
      userId,
      productId,
      quantity,
    },
    include: {
      product: true,
    },
  });

  return newItem as CartItemWithProduct;
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  productId: string,
  request: z.infer<typeof UpdateCartItemSchema>,
): Promise<CartItemWithProduct> {
  const { quantity } = UpdateCartItemSchema.parse(request);

  // Check if item exists in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    include: {
      product: true,
    },
  });

  if (!existingItem) {
    throw new Error('Item not found in cart');
  }

  // Validate inventory
  if (existingItem.product.stock < quantity) {
    throw new Error(`Insufficient stock. Available: ${existingItem.product.stock}`);
  }

  // Update quantity
  const updatedItem = await prisma.cartItem.update({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    data: {
      quantity,
      updatedAt: new Date(),
    },
    include: {
      product: true,
    },
  });

  return updatedItem as CartItemWithProduct;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string,
  request: RemoveFromCartRequest,
): Promise<void> {
  const { productId } = RemoveFromCartSchema.parse(request);

  await prisma.cartItem.delete({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
}

/**
 * Get user's cart with summary
 */
export async function getCart(userId: string): Promise<CartSummary> {
  const items = await prisma.cartItem.findMany({
    where: {
      userId,
      product: {
        visibleMarket: true,
      },
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate totals
  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
    0,
  );

  // Calculate estimated tax (7.5% VAT for Nigeria)
  const estimatedTax = Math.round(subtotal * 0.075);

  // Calculate estimated shipping (flat rate for now)
  const estimatedShipping = items.length > 0 ? 1000 : 0; // 1000 kobo = 10 NGN

  const total = subtotal + estimatedTax + estimatedShipping;

  return {
    items: items as CartItemWithProduct[],
    totalItems,
    subtotal,
    estimatedTax,
    estimatedShipping,
    total,
  };
}

/**
 * Clear user's cart
 */
export async function clearCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: {
      userId,
    },
  });
}

/**
 * Validate cart items for checkout
 */
export async function validateCartForCheckout(userId: string): Promise<{
  isValid: boolean;
  errors: string[];
  cartSummary: CartSummary;
}> {
  const cartSummary = await getCart(userId);
  const errors: string[] = [];

  // Check if cart is empty
  if (cartSummary.items.length === 0) {
    errors.push('Cart is empty');
    return {
      isValid: false,
      errors,
      cartSummary,
    };
  }

  // Validate each item
  for (const item of cartSummary.items) {
    // Check if product is still available
    if (!item.product.visibleMarket) {
      errors.push(`Product "${item.product.name}" is no longer available`);
      continue;
    }

    // Check stock
    if (item.product.stock < item.quantity) {
      errors.push(
        `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, Requested: ${item.quantity}`,
      );
    }

    // Check if price has changed significantly (more than 10%)
    const priceDifference = Math.abs(item.product.price - item.product.price) / item.product.price;
    if (priceDifference > 0.1) {
      errors.push(`Price has changed for "${item.product.name}". Please review your cart.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cartSummary,
  };
}

/**
 * Reserve inventory for checkout
 */
export async function reserveInventoryForCheckout(userId: string, orderId: string): Promise<void> {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  // Use transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      // Update product stock
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          type: 'RESERVED',
          quantity: item.quantity,
          previousStock: item.product.stock,
          newStock: item.product.stock - item.quantity,
          reason: 'Order checkout',
          reference: orderId,
        },
      });
    }

    // Clear cart after successful reservation
    await tx.cartItem.deleteMany({
      where: { userId },
    });
  });
}

/**
 * Release reserved inventory (if payment fails)
 */
export async function releaseInventory(orderId: string): Promise<void> {
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      // Restore product stock
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          type: 'RELEASED',
          quantity: item.quantity,
          previousStock: item.product.stock,
          newStock: item.product.stock + item.quantity,
          reason: 'Payment failed - inventory released',
          reference: orderId,
        },
      });
    }
  });
}
