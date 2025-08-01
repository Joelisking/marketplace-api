import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { signAccess } from '../src/utils/jwt';

describe('Search Enhancements with pg_trgm', () => {
  let customerToken: string;
  let vendorToken: string;
  let storeId: string;

  beforeAll(async () => {
    // Create test users
    const customer = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        password: 'password123',
        role: 'CUSTOMER',
      },
    });

    const vendor = await prisma.user.create({
      data: {
        email: 'vendor@test.com',
        password: 'password123',
        role: 'VENDOR',
      },
    });

    // Create test store
    const store = await prisma.store.create({
      data: {
        name: 'Kofi Fashion Store',
        slug: 'kofi-fashion',
        owner: { connect: { id: vendor.id } },
      },
    });

    storeId = store.id;

    // Create test products
    await prisma.product.createMany({
      data: [
        {
          storeId: store.id,
          name: 'Traditional Ankara Dress',
          price: 5000,
          stock: 10,
          imageUrl: 'https://example.com/ankara-dress.jpg',
          description: 'Beautiful traditional ankara dress',
        },
        {
          storeId: store.id,
          name: 'Modern Ankara Shirt',
          price: 3000,
          stock: 15,
          imageUrl: 'https://example.com/ankara-shirt.jpg',
          description: 'Modern ankara shirt for men',
        },
        {
          storeId: store.id,
          name: 'Casual T-Shirt',
          price: 1500,
          stock: 20,
          imageUrl: 'https://example.com/tshirt.jpg',
          description: 'Comfortable casual t-shirt',
        },
      ],
    });

    customerToken = signAccess(customer);
    vendorToken = signAccess(vendor);
  });

  afterAll(async () => {
    await prisma.product.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Enhanced Product Search', () => {
    it('should find products with exact matches', async () => {
      const response = await request(app)
        .get('/products?q=ankara')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.some((p: any) => p.name.toLowerCase().includes('ankara'))).toBe(
        true,
      );
    });

    it('should find products with typos using pg_trgm', async () => {
      const response = await request(app)
        .get('/products?q=ankra') // Typo: missing 'a'
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.some((p: any) => p.name.toLowerCase().includes('ankara'))).toBe(
        true,
      );
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/products?category=Traditional Wear')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.every((p: any) => p.category === 'Traditional Wear')).toBe(true);
    });

    it('should combine search and category filtering', async () => {
      const response = await request(app)
        .get('/products?q=ankara&category=Traditional Wear')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(
        response.body.items.every(
          (p: any) => p.category === 'Traditional Wear' && p.name.toLowerCase().includes('ankara'),
        ),
      ).toBe(true);
    });

    it('should search in product descriptions', async () => {
      const response = await request(app)
        .get('/products?q=beautiful')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(
        response.body.items.some((p: any) => p.description?.toLowerCase().includes('beautiful')),
      ).toBe(true);
    });
  });

  describe('Enhanced Store Search', () => {
    it('should find stores with exact matches', async () => {
      const response = await request(app).get('/stores?q=kofi');

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.some((s: any) => s.name.toLowerCase().includes('kofi'))).toBe(
        true,
      );
    });

    it('should find stores with typos using pg_trgm', async () => {
      const response = await request(app)
        .get('/stores?q=kof') // Typo: missing 'i'
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.some((s: any) => s.name.toLowerCase().includes('kofi'))).toBe(
        true,
      );
    });
  });

  describe('Vendor Metrics', () => {
    it('should return vendor metrics with daily sales counts', async () => {
      const response = await request(app)
        .get('/vendor/metrics?days=30')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('dailySales');
      expect(Array.isArray(response.body.dailySales)).toBe(true);
    });

    it('should return vendor metrics with custom date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/vendor/metrics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body.period).toContain(startDate);
      expect(response.body.period).toContain(endDate);
    });
  });
});
