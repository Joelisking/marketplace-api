import { EnhancedCartService } from '../src/services/enhanced-cart.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Enhanced Cart Service', () => {
  let customerId: string;
  let vendorId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();

    // Create test user (customer)
    const customer = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        password: 'hashedpassword',
        role: 'CUSTOMER',
        firstName: 'Test',
        lastName: 'Customer',
      },
    });
    customerId = customer.id;

    // Create test vendor
    const vendor = await prisma.user.create({
      data: {
        email: 'vendor@test.com',
        password: 'hashedpassword',
        role: 'VENDOR',
        firstName: 'Test',
        lastName: 'Vendor',
      },
    });
    vendorId = vendor.id;

    // Create test store
    const store = await prisma.store.create({
      data: {
        name: 'Test Store',
        slug: 'test-store',
        description: 'A test store',
        owner: {
          connect: { id: vendorId },
        },
        isActive: true,
      },
    });
    storeId = store.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        stock: 100,
        storeId: storeId,
        isActive: true,
        visibleMarket: true,
        imageUrl: 'https://example.com/image.jpg',
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear cart before each test
    await prisma.cartItem.deleteMany({
      where: { userId: customerId },
    });
  });

  describe('Enhanced Cart Service', () => {
    const enhancedCartService = new EnhancedCartService();

    it('should add item to cart with enhanced response', async () => {
      const result = await enhancedCartService.addToCart(customerId, productId, 2);

      expect(result.cart.totalItems).toBe(2);
      expect(result.needsSync).toBe(false);
      expect(result.localItemCount).toBe(2);
      expect(result.cart.items).toHaveLength(1);
      expect(result.cart.items[0].productId).toBe(productId);
      expect(result.cart.items[0].quantity).toBe(2);
    });

    it('should update cart item with enhanced response', async () => {
      // First add item
      await enhancedCartService.addToCart(customerId, productId, 1);

      // Then update it
      const result = await enhancedCartService.updateCartItem(customerId, productId, 3);

      expect(result.cart.totalItems).toBe(3);
      expect(result.needsSync).toBe(false);
      expect(result.localItemCount).toBe(3);
      expect(result.cart.items[0].quantity).toBe(3);
    });

    it('should remove item from cart with enhanced response', async () => {
      // First add item
      await enhancedCartService.addToCart(customerId, productId, 2);

      // Then remove it
      const result = await enhancedCartService.removeFromCart(customerId, productId);

      expect(result.cart.totalItems).toBe(0);
      expect(result.needsSync).toBe(false);
      expect(result.localItemCount).toBe(0);
      expect(result.cart.items).toHaveLength(0);
    });

    it('should get cart with sync information', async () => {
      // Add item first
      await enhancedCartService.addToCart(customerId, productId, 2);

      // Get cart without sync data
      const result = await enhancedCartService.getCart(customerId);

      expect(result.cart.totalItems).toBe(2);
      expect(result.needsSync).toBe(false);
      expect(result.localItemCount).toBe(2);
    });

    it('should sync local cart with server', async () => {
      const localItems = [
        { productId, quantity: 2 },
        { productId: 'another-product-id', quantity: 1 },
      ];

      const result = await enhancedCartService.syncLocalCart(customerId, localItems);

      expect(result.cart.totalItems).toBe(2); // Only the valid product should be synced
      expect(result.needsSync).toBe(false);
      expect(result.localItemCount).toBe(2);
      expect(result.syncData).toBeDefined();
      expect(result.syncData?.localItems).toHaveLength(0); // Should be cleared after sync
    });

    it('should validate cart for checkout', async () => {
      // Add item first
      await enhancedCartService.addToCart(customerId, productId, 2);

      const validation = await enhancedCartService.validateCartForCheckout(customerId);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.cartSummary.totalItems).toBe(2);
      expect(validation.needsSync).toBe(false);
    });

    it('should get cart statistics', async () => {
      // Add item first
      await enhancedCartService.addToCart(customerId, productId, 2);

      const stats = await enhancedCartService.getCartStats(customerId);

      expect(stats.totalItems).toBe(2);
      expect(stats.uniqueProducts).toBe(1);
      expect(stats.estimatedTotal).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });

    it('should clear cart completely', async () => {
      // Add item first
      await enhancedCartService.addToCart(customerId, productId, 2);

      // Clear cart
      await enhancedCartService.clearCart(customerId);

      // Verify cart is empty
      const result = await enhancedCartService.getCart(customerId);
      expect(result.cart.totalItems).toBe(0);
      expect(result.cart.items).toHaveLength(0);
    });
  });
});
