import {
  addToCart,
  updateCartItem,
  removeFromCart,
  getCart,
  clearCart,
  type CartSummary,
} from './cart.service';

export interface CartSyncData {
  localItems: Array<{
    productId: string;
    quantity: number;
    addedAt: number;
  }>;
  lastSync: number;
  userId?: string;
}

export interface EnhancedCartResponse {
  cart: CartSummary;
  needsSync: boolean;
  localItemCount: number;
  syncData?: CartSyncData;
}

export class EnhancedCartService {
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Add item to cart with enhanced response
   */
  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<EnhancedCartResponse> {
    // Add to server cart
    await addToCart(userId, { productId, quantity });

    // Get updated cart
    const cart = await getCart(userId);

    return {
      cart,
      needsSync: false,
      localItemCount: cart.totalItems,
    };
  }

  /**
   * Update cart item with enhanced response
   */
  async updateCartItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<EnhancedCartResponse> {
    // Update server cart
    await updateCartItem(userId, productId, { quantity });

    // Get updated cart
    const cart = await getCart(userId);

    return {
      cart,
      needsSync: false,
      localItemCount: cart.totalItems,
    };
  }

  /**
   * Remove item from cart with enhanced response
   */
  async removeFromCart(userId: string, productId: string): Promise<EnhancedCartResponse> {
    // Remove from server cart
    await removeFromCart(userId, { productId });

    // Get updated cart
    const cart = await getCart(userId);

    return {
      cart,
      needsSync: false,
      localItemCount: cart.totalItems,
    };
  }

  /**
   * Get cart with sync information
   */
  async getCart(userId: string, syncData?: CartSyncData): Promise<EnhancedCartResponse> {
    const cart = await getCart(userId);

    if (!syncData) {
      return {
        cart,
        needsSync: false,
        localItemCount: cart.totalItems,
      };
    }

    // Check if sync is needed
    const needsSync = Date.now() - syncData.lastSync > this.SYNC_INTERVAL;

    // Calculate local item count
    const localItemCount = syncData.localItems.reduce((total, item) => total + item.quantity, 0);

    return {
      cart,
      needsSync,
      localItemCount,
      syncData,
    };
  }

  /**
   * Sync local cart data with server
   */
  async syncLocalCart(
    userId: string,
    localItems: Array<{ productId: string; quantity: number }>,
  ): Promise<EnhancedCartResponse> {
    // Sync each local item with server
    for (const localItem of localItems) {
      try {
        await addToCart(userId, { productId: localItem.productId, quantity: localItem.quantity });
      } catch (error) {
        console.warn(`Failed to sync item ${localItem.productId}:`, error);
      }
    }

    // Get updated cart
    const cart = await getCart(userId);

    return {
      cart,
      needsSync: false,
      localItemCount: cart.totalItems,
      syncData: {
        localItems: [],
        lastSync: Date.now(),
        userId,
      },
    };
  }

  /**
   * Clear cart completely
   */
  async clearCart(userId: string): Promise<void> {
    await clearCart(userId);
  }

  /**
   * Validate cart for checkout with enhanced response
   */
  async validateCartForCheckout(userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    cartSummary: CartSummary;
    needsSync: boolean;
  }> {
    const cart = await getCart(userId);

    // Basic validation
    const errors: string[] = [];

    if (cart.totalItems === 0) {
      errors.push('Cart is empty');
    }

    if (cart.total <= 0) {
      errors.push('Invalid cart total');
    }

    // Check inventory for each item
    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        errors.push(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      cartSummary: cart,
      needsSync: false,
    };
  }

  /**
   * Get cart statistics
   */
  async getCartStats(userId: string): Promise<{
    totalItems: number;
    uniqueProducts: number;
    estimatedTotal: number;
    lastUpdated: Date;
  }> {
    const cart = await getCart(userId);

    return {
      totalItems: cart.totalItems,
      uniqueProducts: cart.items.length,
      estimatedTotal: cart.total,
      lastUpdated: new Date(),
    };
  }
}
