import { PrismaClient } from '@prisma/client';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  validateCartForCheckout,
} from '../src/services/cart.service';
import {
  createOrder,
  getOrderById,
  getCustomerOrders,
  updateOrderStatus,
} from '../src/services/order.service';

const prisma = new PrismaClient();

describe('Cart & Order Core Services', () => {
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

    // Create test customer
    const customer = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        password: 'password123',
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
        password: 'password123',
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
      },
    });
    storeId = store.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 1000, // 10 NGN in kobo
        stock: 50,
        imageUrl: 'https://example.com/image.jpg',
        description: 'A test product',
        storeId,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Cart Service', () => {
    it('should add item to cart successfully', async () => {
      const cartItem = await addToCart(customerId, {
        productId,
        quantity: 2,
      });

      expect(cartItem.productId).toBe(productId);
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.product.name).toBe('Test Product');
      expect(cartItem.product.price).toBe(1000);
    });

    it('should get cart summary with calculations', async () => {
      const cartSummary = await getCart(customerId);

      expect(cartSummary.totalItems).toBe(2);
      expect(cartSummary.subtotal).toBe(2000); // 2 * 1000
      expect(cartSummary.estimatedTax).toBe(150); // 7.5% of 2000
      expect(cartSummary.estimatedShipping).toBe(1000); // 10 NGN
      expect(cartSummary.total).toBe(3150); // 2000 + 150 + 1000
      expect(cartSummary.items).toHaveLength(1);
    });

    it('should update cart item quantity', async () => {
      const updatedItem = await updateCartItem(customerId, productId, {
        quantity: 3,
      });

      expect(updatedItem.quantity).toBe(3);
    });

    it('should validate cart for checkout', async () => {
      const validation = await validateCartForCheckout(customerId);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.cartSummary.totalItems).toBe(3);
    });

    it('should remove item from cart', async () => {
      await removeFromCart(customerId, { productId });

      const cartSummary = await getCart(customerId);
      expect(cartSummary.items).toHaveLength(0);
      expect(cartSummary.totalItems).toBe(0);
    });
  });

  describe('Order Service', () => {
    beforeEach(async () => {
      // Add item back to cart for order testing
      await addToCart(customerId, {
        productId,
        quantity: 2,
      });
    });

    it('should create order from cart successfully', async () => {
      const order = await createOrder(customerId, {
        storeId,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Nigeria',
        },
      });

      expect(order.customerId).toBe(customerId);
      expect(order.storeId).toBe(storeId);
      expect(order.status).toBe('PENDING');
      expect(order.paymentStatus).toBe('UNPAID');
      expect(order.subtotal).toBe(2000);
      expect(order.total).toBe(3150); // Including tax and shipping
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe(productId);
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].price).toBe(1000);
      expect(order.items[0].price * order.items[0].quantity).toBe(2000);
    });

    it('should get order by ID', async () => {
      const order = await createOrder(customerId, {
        storeId,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Nigeria',
        },
      });

      const retrievedOrder = await getOrderById(order.id);
      expect(retrievedOrder.id).toBe(order.id);
      expect(retrievedOrder.status).toBe('PENDING');
    });

    it('should update order status', async () => {
      const order = await createOrder(customerId, {
        storeId,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Nigeria',
        },
      });

      const updatedOrder = await updateOrderStatus(order.id, {
        status: 'PROCESSING',
      });

      expect(updatedOrder.status).toBe('PROCESSING');
    });

    it('should get customer orders', async () => {
      const result = await getCustomerOrders(customerId, {
        page: 1,
        limit: 10,
      });

      expect(result.orders.length).toBeGreaterThan(0);
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('Inventory Management', () => {
    it('should reserve inventory during order creation', async () => {
      // Get current stock before creating order
      const productBefore = await prisma.product.findUnique({
        where: { id: productId },
      });
      const stockBefore = productBefore?.stock || 0;

      // Create order
      await createOrder(customerId, {
        storeId,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Nigeria',
        },
      });

      // Check that stock was reduced
      const productAfter = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(productAfter?.stock).toBe(stockBefore - 2); // 2 items ordered
    });
  });
});
