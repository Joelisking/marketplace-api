import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('Phase 3: Customer Experience', () => {
  let customerToken: string;
  let vendorToken: string;
  let storeId: string;
  let orderId: string;

  beforeAll(async () => {
    // Create test customer
    const customerResponse = await request(app).post('/auth/register').send({
      email: 'customer@test.com',
      password: 'password123',
      role: 'CUSTOMER',
      firstName: 'Test',
      lastName: 'Customer',
    });
    customerToken = customerResponse.body.token;

    // Create test vendor
    const vendorResponse = await request(app).post('/auth/register').send({
      email: 'vendor@test.com',
      password: 'password123',
      role: 'VENDOR',
      firstName: 'Test',
      lastName: 'Vendor',
    });
    vendorToken = vendorResponse.body.token;

    // Create store for vendor
    const storeResponse = await request(app)
      .post('/vendor/stores')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        name: 'Test Store',
        description: 'A test store',
      });
    storeId = storeResponse.body.store.id;

    // Create product
    await request(app).post('/vendor/products').set('Authorization', `Bearer ${vendorToken}`).send({
      name: 'Test Product',
      price: 1000,
      stock: 10,
      imageUrl: 'https://example.com/image.jpg',
      description: 'A test product',
    });

    // Add product to cart
    await request(app).post('/cart/add').set('Authorization', `Bearer ${customerToken}`).send({
      productId: 'test-product-id',
      quantity: 2,
    });

    // Create order
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

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.orderEvent.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Customer Dashboard', () => {
    it('should get customer dashboard statistics', async () => {
      const response = await request(app)
        .get('/customer/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Dashboard statistics retrieved successfully');
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('totalSpent');
      expect(response.body.data).toHaveProperty('averageOrderValue');
      expect(response.body.data).toHaveProperty('ordersThisMonth');
      expect(response.body.data).toHaveProperty('spendingThisMonth');
      expect(response.body.data).toHaveProperty('favoriteStores');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('orderStatusBreakdown');
    });

    it('should get customer analytics', async () => {
      const response = await request(app)
        .get('/customer/analytics?days=30')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Customer analytics retrieved successfully');
      expect(response.body.data).toHaveProperty('orderTrends');
      expect(response.body.data).toHaveProperty('spendingTrends');
    });

    it('should get customer preferences', async () => {
      const response = await request(app)
        .get('/customer/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Customer preferences retrieved successfully');
      expect(response.body.data).toHaveProperty('totalSpent');
      expect(response.body.data).toHaveProperty('averageOrderValue');
      expect(response.body.data).toHaveProperty('favoriteProducts');
      expect(response.body.data).toHaveProperty('preferredStores');
    });
  });

  describe('Order Tracking', () => {
    it('should get order tracking details', async () => {
      const response = await request(app)
        .get(`/customer/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order tracking details retrieved successfully');
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('paymentStatus');
      expect(response.body.data).toHaveProperty('trackingEvents');
      expect(response.body.data).toHaveProperty('deliveryUpdates');
      expect(response.body.data).toHaveProperty('currentLocation');
    });

    it('should update order status and trigger notification', async () => {
      // Update order status
      const updateResponse = await request(app)
        .patch(`/vendor/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          status: 'PROCESSING',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.order.status).toBe('PROCESSING');

      // Check if notification was created
      const notificationsResponse = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body.data.notifications.length).toBeGreaterThan(0);

      const orderNotification = notificationsResponse.body.data.notifications.find(
        (n: any) => n.metadata?.orderId === orderId,
      );
      expect(orderNotification).toBeDefined();
      expect(orderNotification.type).toBe('ORDER_STATUS_UPDATED');
    });
  });

  describe('Notification System', () => {
    it('should get user notifications', async () => {
      const response = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Notifications retrieved successfully');
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should get unread notification count', async () => {
      const response = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Unread notification count retrieved successfully');
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });

    it('should mark notification as read', async () => {
      // Get notifications first
      const notificationsResponse = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      if (notificationsResponse.body.data.notifications.length > 0) {
        const notificationId = notificationsResponse.body.data.notifications[0].id;

        const response = await request(app)
          .patch(`/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${customerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Notification marked as read successfully');
      }
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All notifications marked as read successfully');
    });
  });

  describe('Payment Notifications', () => {
    it('should send payment notification on successful payment', async () => {
      // Simulate payment success by calling webhook handler
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'test-payment-ref',
          amount: 2000,
          status: 'success',
        },
      };

      // Create a test payment first
      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount: 2000,
          currency: 'NGN',
          provider: 'paystack',
          reference: 'test-payment-ref',
          status: 'PENDING',
        },
      });

      // Import and call webhook handler
      const { handleWebhookEvent } = await import('../src/services/payment.service');
      await handleWebhookEvent(webhookPayload);

      // Check if payment notification was created
      const notificationsResponse = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(notificationsResponse.status).toBe(200);

      const paymentNotification = notificationsResponse.body.data.notifications.find(
        (n: any) => n.type === 'PAYMENT_RECEIVED',
      );
      expect(paymentNotification).toBeDefined();
      expect(paymentNotification.title).toBe('Payment Successful');
    });
  });

  describe('Order Status Notifications', () => {
    it('should send notifications for different order status changes', async () => {
      // Test SHIPPED status
      await request(app)
        .patch(`/vendor/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'SHIPPED' });

      // Test DELIVERED status
      await request(app)
        .patch(`/vendor/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'DELIVERED' });

      // Check notifications
      const notificationsResponse = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(notificationsResponse.status).toBe(200);

      const shippedNotification = notificationsResponse.body.data.notifications.find(
        (n: any) => n.type === 'ORDER_SHIPPED',
      );
      const deliveredNotification = notificationsResponse.body.data.notifications.find(
        (n: any) => n.type === 'ORDER_DELIVERED',
      );

      expect(shippedNotification).toBeDefined();
      expect(deliveredNotification).toBeDefined();
    });
  });
});
