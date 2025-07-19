/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Client-side cart storage utility
 * This file is designed to be used in frontend applications
 */

export interface LocalCartItem {
  productId: string;
  quantity: number;
  addedAt: number;
}

export interface LocalCart {
  items: LocalCartItem[];
  lastSync: number;
  userId?: string;
}

export class CartStorage {
  private readonly CART_STORAGE_KEY = 'marketplace_cart';

  /**
   * Get cart from local storage
   */
  getCart(): LocalCart | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = (window as any).localStorage?.getItem(this.CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to parse local cart:', error);
      return null;
    }
  }

  /**
   * Save cart to local storage
   */
  saveCart(cart: LocalCart): void {
    if (typeof window === 'undefined') return;

    try {
      (window as any).localStorage?.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.warn('Failed to save local cart:', error);
    }
  }

  /**
   * Clear local cart
   */
  clearCart(): void {
    if (typeof window === 'undefined') return;

    try {
      (window as any).localStorage?.removeItem(this.CART_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear local cart:', error);
    }
  }

  /**
   * Add item to local cart
   */
  addItem(productId: string, quantity: number): LocalCart {
    const cart = this.getCart() || { items: [], lastSync: 0 };

    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.addedAt = Date.now();
    } else {
      cart.items.push({
        productId,
        quantity,
        addedAt: Date.now(),
      });
    }

    cart.lastSync = Date.now();
    this.saveCart(cart);

    return cart;
  }

  /**
   * Update item quantity in local cart
   */
  updateItem(productId: string, quantity: number): LocalCart {
    const cart = this.getCart() || { items: [], lastSync: 0 };

    const item = cart.items.find((item) => item.productId === productId);
    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter((item) => item.productId !== productId);
      } else {
        item.quantity = quantity;
        item.addedAt = Date.now();
      }
    }

    cart.lastSync = Date.now();
    this.saveCart(cart);

    return cart;
  }

  /**
   * Remove item from local cart
   */
  removeItem(productId: string): LocalCart {
    const cart = this.getCart() || { items: [], lastSync: 0 };

    cart.items = cart.items.filter((item) => item.productId !== productId);
    cart.lastSync = Date.now();
    this.saveCart(cart);

    return cart;
  }

  /**
   * Get total item count
   */
  getItemCount(): number {
    const cart = this.getCart();
    if (!cart) return 0;

    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Check if cart needs sync (older than 5 minutes)
   */
  needsSync(): boolean {
    const cart = this.getCart();
    if (!cart) return false;

    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cart.lastSync > SYNC_INTERVAL;
  }

  /**
   * Mark cart as synced
   */
  markSynced(userId?: string): void {
    const cart = this.getCart() || { items: [], lastSync: 0 };
    cart.lastSync = Date.now();
    if (userId) cart.userId = userId;
    this.saveCart(cart);
  }

  /**
   * Get cart for API sync
   */
  getCartForSync(): Array<{ productId: string; quantity: number }> {
    const cart = this.getCart();
    if (!cart) return [];

    return cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
}

// Export singleton instance
export const cartStorage = new CartStorage();
