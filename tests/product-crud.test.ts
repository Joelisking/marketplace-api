import request from 'supertest';
import { app } from './mocks/app';
import { prisma } from '../src/lib/prisma';
import { cleanupTestData, refreshUserToken, createTestStore } from './utils/test-helpers';

describe('Product CRUD Operations', () => {
  let vendorToken: string;
  let vendorId: string;
  let storeId: string;
  let productId: string;
  let otherVendorToken: string;
  let otherVendorId: string;
  let otherStoreId: string;

  // Test data
  const vendorEmail = `vendor${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const otherVendorEmail = `othervendor${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const productData = {
    name: `Test Product ${Date.now()}`,
    price: 5000,
    stock: 10,
    imageUrl: 'https://example.com/image.jpg',
    visibleMarket: true,
  };

  beforeAll(async () => {
    // Create test vendor and store
    const vendorResponse = await request(app)
      .post('/auth/register')
      .send({ email: vendorEmail, password: 'password123' });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: vendorEmail, password: 'password123' });

    vendorToken = loginResponse.body.accessToken;
    vendorId = loginResponse.body.user.id;

    // Create stores for vendors (this will promote them to VENDOR role)
    const store1 = await createTestStore(vendorToken, {
      name: 'Test Store 1',
      slug: `test-store-1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      logoUrl: 'https://example.com/logo1.jpg',
    });

    // Create other vendor and store
    const otherVendorResponse = await request(app)
      .post('/auth/register')
      .send({ email: otherVendorEmail, password: 'password123' });

    const otherLoginResponse = await request(app)
      .post('/auth/login')
      .send({ email: otherVendorEmail, password: 'password123' });

    otherVendorToken = otherLoginResponse.body.accessToken;
    otherVendorId = otherLoginResponse.body.user.id;

    const store2 = await createTestStore(otherVendorToken, {
      name: 'Test Store 2',
      slug: `test-store-2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      logoUrl: 'https://example.com/logo2.jpg',
    });

    // Update tokens with the new tokens that include VENDOR role
    if (store1.newToken) {
      vendorToken = store1.newToken;
    }
    if (store2.newToken) {
      otherVendorToken = store2.newToken;
    }

    // Extract store IDs
    storeId = store1.id;
    otherStoreId = store2.id;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData([vendorId, otherVendorId], [storeId, otherStoreId]);
  });

  describe('POST /products', () => {
    it('should create a product successfully', async () => {
      const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        ...productData,
        storeId,
        store: {
          id: storeId,
          name: 'Test Store 1',
          slug: expect.any(String),
        },
      });
      expect(response.body.id).toBeDefined();

      productId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post('/products').send(productData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Missing token');
    });

    it('should fail if user does not own a store', async () => {
      // Create a customer user without a store
      const customerEmail = `customer${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
      await request(app)
        .post('/auth/register')
        .send({ email: customerEmail, password: 'password123' });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: customerEmail, password: 'password123' });

      const customerToken = loginResponse.body.accessToken;

      const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(productData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Vendor role required - you must have vendor permissions to create products',
      );

      // Clean up
      await prisma.user.delete({
        where: { email: customerEmail },
      });
    });
  });

  describe('GET /products/:id', () => {
    it('should get a product by ID', async () => {
      const response = await request(app).get(`/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ...productData,
        id: productId,
        storeId,
        store: {
          id: storeId,
          name: 'Test Store 1',
          slug: expect.any(String),
        },
      });
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app).get('/products/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product successfully', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 7500,
        stock: 25,
      };

      const response = await request(app)
        .put(`/products/${productId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ...updateData,
        id: productId,
        storeId,
        imageUrl: productData.imageUrl, // Should remain unchanged
        visibleMarket: productData.visibleMarket, // Should remain unchanged
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/products/${productId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Missing token');
    });

    it("should fail when updating another vendor's product", async () => {
      // Create a product for the other vendor
      const otherProductResponse = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send(productData);

      const otherProductId = otherProductResponse.body.id;

      const response = await request(app)
        .put(`/products/${otherProductId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied - you do not own this product');

      // Clean up
      await prisma.product.delete({
        where: { id: otherProductId },
      });
    });

    it('should return 403 for non-existent product', async () => {
      const response = await request(app)
        .put('/products/non-existent-id')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied - you do not own this product');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product successfully', async () => {
      const response = await request(app)
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(204);

      // Verify product is deleted
      const getResponse = await request(app).get(`/products/${productId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should fail without authentication', async () => {
      // Create a new product to delete
      const createResponse = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(productData);

      const newProductId = createResponse.body.id;

      const response = await request(app).delete(`/products/${newProductId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Missing token');

      // Clean up
      if (newProductId) {
        await prisma.product.delete({
          where: { id: newProductId },
        });
      }
    });

    it("should fail when deleting another vendor's product", async () => {
      // Create a product for the other vendor
      const otherProductResponse = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send(productData);

      const otherProductId = otherProductResponse.body.id;

      const response = await request(app)
        .delete(`/products/${otherProductId}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied - you do not own this product');

      // Clean up
      await prisma.product.delete({
        where: { id: otherProductId },
      });
    });

    it('should return 403 for non-existent product', async () => {
      const response = await request(app)
        .delete('/products/non-existent-id')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied - you do not own this product');
    });
  });

  describe('GET /products', () => {
    let testProductName: string;

    beforeEach(async () => {
      // Create some test products
      const product1Name = `Product 1 ${Date.now()}`;
      const product2Name = `Product 2 ${Date.now()}`;

      await request(app).post('/products').set('Authorization', `Bearer ${vendorToken}`).send({
        name: product1Name,
        price: 1000,
        stock: 5,
        imageUrl: 'https://example.com/product1.jpg',
      });

      await request(app).post('/products').set('Authorization', `Bearer ${vendorToken}`).send({
        name: product2Name,
        price: 2000,
        stock: 10,
        imageUrl: 'https://example.com/product2.jpg',
      });

      // Store the first product name for search test
      testProductName = product1Name;
    });

    it('should list products with pagination', async () => {
      const response = await request(app).get('/products?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        total: expect.any(Number),
        page: 1,
        pageSize: 2,
      });
    });

    it('should filter products by search query', async () => {
      const response = await request(app).get(`/products?q=${testProductName}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe(testProductName);
    });

    it('should filter products by store', async () => {
      const response = await request(app).get(`/products?storeId=${storeId}`);

      expect(response.status).toBe(200);
      expect(response.body.items.every((p: any) => p.storeId === storeId)).toBe(true);
    });
  });
});
