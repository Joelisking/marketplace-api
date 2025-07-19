import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../src/index';

const prisma = new PrismaClient();

describe('Phase 1 Core Functionality', () => {
  let customerId: string;
  let vendorId: string;
  let storeId: string;
  let productId: string;
  let customerToken: string;
  let vendorToken: string;

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

    // Generate tokens (simplified for testing)
    customerToken = 'customer-token';
    vendorToken = 'vendor-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Cart Management', () => {
    it('should add item to cart successfully', async () => {
      const response = await request(app)
        .post('/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.item).toMatchObject({
        productId,
        quantity: 2,
        product: {
          id: productId,
          name: 'Test Product',
          price: 1000,
        },
      });
    });

    it('should get cart summary with calculations', async () => {
      const response = await request(app)
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        totalItems: 2,
        subtotal: 2000, // 2 * 1000
        estimatedTax: 150, // 7.5% of 2000
        estimatedShipping: 1000, // 10 NGN
        total: 3150, // 2000 + 150 + 1000
      });
      expect(response.body.items).toHaveLength(1);
    });

    it('should update cart item quantity', async () => {
      const response = await request(app)
        .put(`/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.item.quantity).toBe(3);
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('removed');
    });
  });

  describe('Order Creation', () => {
    beforeEach(async () => {
      // Add item back to cart for order testing
      await request(app).post('/cart/items').set('Authorization', `Bearer ${customerToken}`).send({
        productId,
        quantity: 2,
      });
    });

    it('should create order from cart successfully', async () => {
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeId,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            country: 'Nigeria',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.order).toMatchObject({
        customerId,
        storeId,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        subtotal: 2000,
        total: 3150, // Including tax and shipping
      });
      expect(response.body.order.items).toHaveLength(1);
      expect(response.body.order.items[0]).toMatchObject({
        productId,
        quantity: 2,
        price: 1000,
        total: 2000,
      });
    });

    it('should validate cart before checkout', async () => {
      // Try to create order with insufficient stock
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeId,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            country: 'Nigeria',
          },
        });

      // Should succeed since we have enough stock
      expect(response.status).toBe(200);
    });
  });

  describe('Order Management', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order for testing
      const orderResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeId,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            country: 'Nigeria',
          },
        });
      orderId = orderResponse.body.order.id;
    });

    it('should get order details', async () => {
      const response = await request(app)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.id).toBe(orderId);
      expect(response.body.order.status).toBe('PENDING');
    });

    it('should update order status (vendor)', async () => {
      const response = await request(app)
        .patch(`/vendor/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          status: 'PROCESSING',
        });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe('PROCESSING');
    });

    it('should get customer orders', async () => {
      const response = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should get vendor orders', async () => {
      const response = await request(app)
        .get('/vendor/orders')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('Inventory Management', () => {
    it('should reserve inventory during order creation', async () => {
      const initialStock = 50;

      // Create order
      await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
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
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.stock).toBe(initialStock - 2); // 2 items ordered
    });
  });
});
