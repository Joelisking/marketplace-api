import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('Vendor Analytics & Fulfillment Tracking', () => {
  let vendorToken: string;
  let customerToken: string;
  let storeId: string;
  let orderId: string;

  beforeAll(async () => {
    // Create test vendor
    const vendorResponse = await request(app).post('/auth/register').send({
      email: 'vendor-analytics@test.com',
      password: 'password123',
      role: 'VENDOR',
      firstName: 'Analytics',
      lastName: 'Vendor',
    });

    vendorToken = vendorResponse.body.token;

    // Create test customer
    const customerResponse = await request(app).post('/auth/register').send({
      email: 'customer-analytics@test.com',
      password: 'password123',
      role: 'CUSTOMER',
      firstName: 'Analytics',
      lastName: 'Customer',
    });

    customerToken = customerResponse.body.token;

    // Create store for vendor
    const storeResponse = await request(app)
      .post('/vendor/store')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        name: 'Analytics Test Store',
        slug: 'analytics-test-store',
        description: 'Test store for analytics',
      });

    storeId = storeResponse.body.store.id;

    // Create test products
    await request(app).post('/vendor/products').set('Authorization', `Bearer ${vendorToken}`).send({
      name: 'Analytics Product 1',
      price: 1000,
      stock: 50,
      imageUrl: 'https://example.com/image1.jpg',
      description: 'Test product for analytics',
    });

    await request(app).post('/vendor/products').set('Authorization', `Bearer ${vendorToken}`).send({
      name: 'Analytics Product 2',
      price: 2000,
      stock: 30,
      imageUrl: 'https://example.com/image2.jpg',
      description: 'Test product for analytics',
    });

    // Create test order
    const orderResponse = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        storeId,
        shippingAddress: {
          street: '123 Analytics St',
          city: 'Analytics City',
          state: 'Analytics State',
          postalCode: '12345',
          country: 'Nigeria',
        },
      });

    orderId = orderResponse.body.order.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.orderEvent.deleteMany({
      where: { orderId },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId },
    });
    await prisma.order.deleteMany({
      where: { id: orderId },
    });
    await prisma.product.deleteMany({
      where: { storeId },
    });
    await prisma.store.deleteMany({
      where: { id: storeId },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['vendor-analytics@test.com', 'customer-analytics@test.com'],
        },
      },
    });
  });

  describe('Vendor Analytics', () => {
    it('should get vendor analytics for 30 days', async () => {
      const response = await request(app)
        .get('/vendor/analytics')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ period: '30d' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('customers');
      expect(response.body).toHaveProperty('performance');

      // Check revenue data
      expect(response.body.revenue).toHaveProperty('total');
      expect(response.body.revenue).toHaveProperty('average');
      expect(response.body.revenue).toHaveProperty('growth');
      expect(response.body.revenue).toHaveProperty('byDay');

      // Check orders data
      expect(response.body.orders).toHaveProperty('total');
      expect(response.body.orders).toHaveProperty('average');
      expect(response.body.orders).toHaveProperty('growth');
      expect(response.body.orders).toHaveProperty('byStatus');

      // Check products data
      expect(response.body.products).toHaveProperty('total');
      expect(response.body.products).toHaveProperty('active');
      expect(response.body.products).toHaveProperty('lowStock');
      expect(response.body.products).toHaveProperty('outOfStock');
      expect(response.body.products).toHaveProperty('bestSellers');

      // Check customers data
      expect(response.body.customers).toHaveProperty('total');
      expect(response.body.customers).toHaveProperty('new');
      expect(response.body.customers).toHaveProperty('returning');
      expect(response.body.customers).toHaveProperty('averageOrderValue');

      // Check performance data
      expect(response.body.performance).toHaveProperty('fulfillmentRate');
      expect(response.body.performance).toHaveProperty('averageFulfillmentTime');
      expect(response.body.performance).toHaveProperty('customerSatisfaction');
      expect(response.body.performance).toHaveProperty('orderAccuracy');
      expect(response.body.performance).toHaveProperty('responseTime');
    });

    it('should get vendor analytics with custom date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get('/vendor/analytics')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body.period).toContain(startDate);
      expect(response.body.period).toContain(endDate);
    });

    it('should get vendor performance metrics', async () => {
      const response = await request(app)
        .get('/vendor/performance')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ days: 30 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fulfillmentRate');
      expect(response.body).toHaveProperty('averageFulfillmentTime');
      expect(response.body).toHaveProperty('customerSatisfaction');
      expect(response.body).toHaveProperty('orderAccuracy');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('completedOrders');
      expect(response.body).toHaveProperty('cancelledOrders');
      expect(response.body).toHaveProperty('refundRate');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('topProducts');
      expect(response.body).toHaveProperty('performanceTrends');

      // Check that metrics are numbers
      expect(typeof response.body.fulfillmentRate).toBe('number');
      expect(typeof response.body.averageFulfillmentTime).toBe('number');
      expect(typeof response.body.customerSatisfaction).toBe('number');
      expect(typeof response.body.orderAccuracy).toBe('number');
      expect(typeof response.body.responseTime).toBe('number');
      expect(typeof response.body.totalOrders).toBe('number');
      expect(typeof response.body.completedOrders).toBe('number');
      expect(typeof response.body.cancelledOrders).toBe('number');
      expect(typeof response.body.refundRate).toBe('number');
      expect(typeof response.body.averageOrderValue).toBe('number');

      // Check arrays
      expect(Array.isArray(response.body.topProducts)).toBe(true);
      expect(Array.isArray(response.body.performanceTrends)).toBe(true);
    });

    it('should reject unauthorized access to analytics', async () => {
      const response = await request(app).get('/vendor/analytics').query({ period: '30d' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject customer access to vendor analytics', async () => {
      const response = await request(app)
        .get('/vendor/analytics')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ period: '30d' });

      expect(response.status).toBe(403);
    });
  });

  describe('Fulfillment Tracking', () => {
    it('should update order fulfillment tracking', async () => {
      const trackingData = {
        trackingNumber: 'TRK123456789',
        carrier: 'DHL',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        currentLocation: 'Lagos, Nigeria',
        status: 'IN_TRANSIT',
      };

      const response = await request(app)
        .put(`/vendor/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(trackingData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('tracking');
      expect(response.body.tracking).toHaveProperty('orderId', orderId);
      expect(response.body.tracking).toHaveProperty('trackingNumber', trackingData.trackingNumber);
      expect(response.body.tracking).toHaveProperty('carrier', trackingData.carrier);
      expect(response.body.tracking).toHaveProperty('status', trackingData.status);
      expect(response.body.tracking).toHaveProperty('trackingHistory');
      expect(response.body.tracking).toHaveProperty('lastUpdated');
    });

    it('should get order fulfillment tracking', async () => {
      const response = await request(app)
        .get(`/vendor/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orderId', orderId);
      expect(response.body).toHaveProperty('trackingNumber');
      expect(response.body).toHaveProperty('carrier');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('estimatedDelivery');
      expect(response.body).toHaveProperty('currentLocation');
      expect(response.body).toHaveProperty('trackingHistory');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.trackingHistory)).toBe(true);
    });

    it('should mark order as picked up', async () => {
      const pickupData = {
        trackingNumber: 'TRK987654321',
        carrier: 'FedEx',
      };

      const response = await request(app)
        .post(`/vendor/orders/${orderId}/picked-up`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(pickupData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('picked up successfully');
    });

    it('should mark order as out for delivery', async () => {
      const response = await request(app)
        .post(`/vendor/orders/${orderId}/out-for-delivery`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('out for delivery successfully');
    });

    it('should mark order as delivered', async () => {
      const response = await request(app)
        .post(`/vendor/orders/${orderId}/delivered`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('delivered successfully');
    });

    it('should reject tracking updates for non-vendor orders', async () => {
      // Create another vendor and order
      const otherVendorResponse = await request(app).post('/auth/register').send({
        email: 'other-vendor@test.com',
        password: 'password123',
        role: 'VENDOR',
        firstName: 'Other',
        lastName: 'Vendor',
      });

      const otherVendorToken = otherVendorResponse.body.token;

      const otherStoreResponse = await request(app)
        .post('/vendor/store')
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send({
          name: 'Other Store',
          slug: 'other-store',
          description: 'Other test store',
        });

      const otherStoreId = otherStoreResponse.body.store.id;

      const otherOrderResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeId: otherStoreId,
          shippingAddress: {
            street: '456 Other St',
            city: 'Other City',
            state: 'Other State',
            postalCode: '67890',
            country: 'Nigeria',
          },
        });

      const otherOrderId = otherOrderResponse.body.order.id;

      const response = await request(app)
        .put(`/vendor/orders/${otherOrderId}/tracking`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          trackingNumber: 'TRK111111111',
          carrier: 'UPS',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access denied');

      // Clean up
      await prisma.orderItem.deleteMany({
        where: { orderId: otherOrderId },
      });
      await prisma.order.deleteMany({
        where: { id: otherOrderId },
      });
      await prisma.store.deleteMany({
        where: { id: otherStoreId },
      });
      await prisma.user.deleteMany({
        where: { email: 'other-vendor@test.com' },
      });
    });

    it('should reject unauthorized access to tracking', async () => {
      const response = await request(app).get(`/vendor/orders/${orderId}/tracking`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject customer access to tracking', async () => {
      const response = await request(app)
        .get(`/vendor/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Analytics Data Validation', () => {
    it('should validate analytics query parameters', async () => {
      const response = await request(app)
        .get('/vendor/analytics')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ period: 'invalid-period' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate performance query parameters', async () => {
      const response = await request(app)
        .get('/vendor/performance')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ days: 1000 }); // Invalid: exceeds maximum

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate tracking data', async () => {
      const response = await request(app)
        .put(`/vendor/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
