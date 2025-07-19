import request from 'supertest';
import { app } from './mocks/app';
import { prisma } from '../src/lib/prisma';
import { createTestUser, createTestStore, cleanupTestData } from './utils/test-helpers';

describe('Analytics Endpoints', () => {
  let vendor1Token: string;
  let vendor2Token: string;
  let customerToken: string;
  let vendor1Id: string;
  let vendor2Id: string;
  let customerId: string;
  let store1Id: string;
  let store2Id: string;
  let product1Id: string;
  let product2Id: string;
  let product3Id: string;

  const vendor1Email = `vendor1-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const vendor2Email = `vendor2-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const customerEmail = `customer-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;

  beforeAll(async () => {
    // Create test users
    const vendor1 = await createTestUser(vendor1Email, 'CUSTOMER');
    const vendor2 = await createTestUser(vendor2Email, 'CUSTOMER');
    const customer = await createTestUser(customerEmail, 'CUSTOMER');

    vendor1Id = vendor1.id;
    vendor2Id = vendor2.id;
    customerId = customer.id;
    vendor1Token = vendor1.token;
    vendor2Token = vendor2.token;
    customerToken = customer.token;

    // Create stores (this will promote users to VENDOR role)
    const store1 = await createTestStore(vendor1Token, {
      name: 'Analytics Store 1',
      slug: `analytics-store-1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      logoUrl: 'https://example.com/logo1.jpg',
    });

    const store2 = await createTestStore(vendor2Token, {
      name: 'Analytics Store 2',
      slug: `analytics-store-2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      logoUrl: 'https://example.com/logo2.jpg',
    });

    store1Id = store1.id;
    store2Id = store2.id;

    // Update tokens with new VENDOR role
    if (store1.newToken) vendor1Token = store1.newToken;
    if (store2.newToken) vendor2Token = store2.newToken;

    // Create products
    const product1 = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${vendor1Token}`)
      .send({
        name: 'Best Seller Product',
        price: 1000,
        stock: 50,
        imageUrl: 'https://example.com/product1.jpg',
        visibleMarket: true,
      });

    const product2 = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${vendor1Token}`)
      .send({
        name: 'Popular Product',
        price: 2000,
        stock: 30,
        imageUrl: 'https://example.com/product2.jpg',
        visibleMarket: true,
      });

    const product3 = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${vendor2Token}`)
      .send({
        name: 'Another Store Product',
        price: 1500,
        stock: 25,
        imageUrl: 'https://example.com/product3.jpg',
        visibleMarket: true,
      });

    product1Id = product1.body.id;
    product2Id = product2.body.id;
    product3Id = product3.body.id;

    // Create orders to simulate sales
    await createTestOrders();
  });

  afterAll(async () => {
    // Clean up all test data including orders
    await prisma.orderItem.deleteMany({
      where: {
        product: {
          storeId: { in: [store1Id, store2Id] },
        },
      },
    });
    await prisma.order.deleteMany({
      where: {
        storeId: { in: [store1Id, store2Id] },
      },
    });
    await cleanupTestData([vendor1Id, vendor2Id, customerId], [store1Id, store2Id]);
  });

  async function createTestOrders() {
    // Create orders for vendor1's products
    const order1 = await prisma.order.create({
      data: {
        customerId,
        storeId: store1Id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        total: 3000,
        items: {
          create: [
            {
              productId: product1Id,
              quantity: 2,
              price: 1000,
            },
            {
              productId: product2Id,
              quantity: 1,
              price: 2000,
            },
          ],
        },
      },
    });

    const order2 = await prisma.order.create({
      data: {
        customerId,
        storeId: store1Id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        total: 1000,
        items: {
          create: [
            {
              productId: product1Id,
              quantity: 1,
              price: 1000,
            },
          ],
        },
      },
    });

    // Create order for vendor2's product
    const order3 = await prisma.order.create({
      data: {
        customerId,
        storeId: store2Id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        total: 1500,
        items: {
          create: [
            {
              productId: product3Id,
              quantity: 1,
              price: 1500,
            },
          ],
        },
      },
    });

    return [order1, order2, order3];
  }

  describe('GET /analytics/best-sellers', () => {
    it('should get global best-selling products', async () => {
      const response = await request(app).get('/analytics/best-sellers?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('all');
      expect(response.body.items.length).toBeGreaterThanOrEqual(3);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);

      // Best seller should be product1 (3 units sold)
      const bestSeller = response.body.items[0];
      expect(bestSeller.name).toBe('Best Seller Product');
      expect(bestSeller.salesData.totalSold).toBe(3);
      expect(bestSeller.salesData.totalRevenue).toBe(3000);
    });

    it('should filter by period', async () => {
      const response = await request(app).get('/analytics/best-sellers?period=month&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('month');
    });
  });

  describe('GET /analytics/stores/:slug/best-sellers', () => {
    it('should get store-specific best-selling products', async () => {
      const store1 = await prisma.store.findUnique({ where: { id: store1Id } });
      const response = await request(app).get(
        `/analytics/stores/${store1!.slug}/best-sellers?limit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.store.id).toBe(store1Id);
      expect(response.body.items).toHaveLength(2); // Only vendor1's products
      expect(response.body.items.every((p: any) => p.name.includes('Product'))).toBe(true);
    });

    it('should return 404 for non-existent store', async () => {
      const response = await request(app).get('/analytics/stores/non-existent-store/best-sellers');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Store not found');
    });
  });

  describe('GET /analytics/featured', () => {
    it('should get featured products (best sellers from last 30 days)', async () => {
      const response = await request(app).get('/analytics/featured?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.meta.period).toBe('last_30_days');
      expect(response.body.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /vendor/products/best-sellers', () => {
    it('should get vendor best-selling products', async () => {
      const response = await request(app)
        .get('/vendor/products/best-sellers?limit=5')
        .set('Authorization', `Bearer ${vendor1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('all');
      expect(response.body.items).toHaveLength(2); // Only vendor1's products

      // Best seller should be product1
      const bestSeller = response.body.items[0];
      expect(bestSeller.name).toBe('Best Seller Product');
      expect(bestSeller.salesData.totalSold).toBe(3);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/vendor/products/best-sellers');

      expect(response.status).toBe(401);
    });
  });

  describe('Enhanced Vendor Dashboard with Sales Data', () => {
    it('should include sales data in vendor dashboard', async () => {
      const response = await request(app)
        .get('/vendor/dashboard')
        .set('Authorization', `Bearer ${vendor1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        totalProducts: 2,
        totalOrders: 2,
        totalRevenue: 4000, // 3000 + 1000
        totalItemsSold: 4, // 2 + 1 + 1
      });
      expect(response.body.recentOrders).toHaveLength(2);
    });

    it('should include sales data in vendor products', async () => {
      const response = await request(app)
        .get('/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);

      const product1 = response.body.items.find((p: any) => p.name === 'Best Seller Product');
      expect(product1.salesData.totalSold).toBe(3);
      expect(product1.salesData.totalRevenue).toBe(3000);
    });

    it('should include sales data in vendor product stats', async () => {
      const response = await request(app)
        .get('/vendor/products/stats')
        .set('Authorization', `Bearer ${vendor1Token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        totalProducts: 2,
        totalSold: 4,
        totalRevenue: 4000,
      });
    });
  });
});
