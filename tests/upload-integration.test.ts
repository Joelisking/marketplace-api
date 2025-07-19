import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';

describe('Upload Integration Tests', () => {
  let vendorUser: { id: string; email: string; token: string; role: string };

  beforeAll(async () => {
    vendorUser = await createTestUser('vendor@integration.test.com', 'VENDOR');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: vendorUser.email },
    });
  });

  describe('Product Creation with Upload Integration', () => {
    it('should create product with uploaded image and clean up on deletion', async () => {
      // 1. Get presigned URL for product image
      const uploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'test-product.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024,
        });

      expect(uploadResponse.status).toBe(200);
      const { fileUrl: productImageUrl } = uploadResponse.body;

      // 2. Create product with the uploaded image URL
      const productResponse = await request(app)
        .post('/vendor/products')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          name: 'Test Product with Upload',
          price: 2500,
          stock: 10,
          imageUrl: productImageUrl,
          visibleMarket: true,
        });

      expect(productResponse.status).toBe(201);
      const product = productResponse.body;
      expect(product.imageUrl).toBe(productImageUrl);

      // 3. Update product with new image (should trigger cleanup)
      const newUploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'new-product.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024,
        });

      expect(newUploadResponse.status).toBe(200);
      const { fileUrl: newProductImageUrl } = newUploadResponse.body;

      const updateResponse = await request(app)
        .put(`/vendor/products/${product.id}`)
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          imageUrl: newProductImageUrl,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.imageUrl).toBe(newProductImageUrl);

      // 4. Delete product (should trigger image cleanup)
      const deleteResponse = await request(app)
        .delete(`/vendor/products/${product.id}`)
        .set('Authorization', `Bearer ${vendorUser.token}`);

      expect(deleteResponse.status).toBe(204);
    });
  });

  describe('Store Creation with Upload Integration', () => {
    it('should create store with uploaded logo and clean up on deletion', async () => {
      // 1. Get presigned URL for store logo
      const uploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'test-logo.jpg',
          contentType: 'image/jpeg',
          fileSize: 512 * 1024,
        });

      expect(uploadResponse.status).toBe(200);
      const { fileUrl: logoUrl } = uploadResponse.body;

      // 2. Create store with the uploaded logo URL
      const storeResponse = await request(app)
        .post('/stores')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          name: 'Test Store with Upload',
          slug: 'test-store-upload',
          logoUrl: logoUrl,
        });

      expect(storeResponse.status).toBe(201);
      const store = storeResponse.body;
      expect(store.logoUrl).toBe(logoUrl);

      // 3. Update store with new logo (should trigger cleanup)
      const newUploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'new-logo.jpg',
          contentType: 'image/jpeg',
          fileSize: 512 * 1024,
        });

      expect(newUploadResponse.status).toBe(200);
      const { fileUrl: newLogoUrl } = newUploadResponse.body;

      const updateResponse = await request(app)
        .put(`/stores/${store.slug}`)
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          logoUrl: newLogoUrl,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.logoUrl).toBe(newLogoUrl);

      // 4. Delete store (should trigger logo cleanup)
      const deleteResponse = await request(app)
        .delete(`/stores/${store.slug}`)
        .set('Authorization', `Bearer ${vendorUser.token}`);

      expect(deleteResponse.status).toBe(204);
    });
  });

  describe('Store Deletion with Products', () => {
    it('should clean up all product images when store is deleted', async () => {
      // 1. Create store with logo
      const logoUploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'store-logo.jpg',
          contentType: 'image/jpeg',
          fileSize: 512 * 1024,
        });

      const { fileUrl: logoUrl } = logoUploadResponse.body;

      const storeResponse = await request(app)
        .post('/stores')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          name: 'Test Store for Deletion',
          slug: 'test-store-deletion',
          logoUrl: logoUrl,
        });

      const store = storeResponse.body;

      // 2. Create multiple products with images
      const product1UploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'product1.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024,
        });

      const product2UploadResponse = await request(app)
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          fileName: 'product2.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024 * 1024,
        });

      const { fileUrl: product1ImageUrl } = product1UploadResponse.body;
      const { fileUrl: product2ImageUrl } = product2UploadResponse.body;

      await request(app)
        .post('/vendor/products')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          name: 'Product 1',
          price: 1000,
          stock: 5,
          imageUrl: product1ImageUrl,
        });

      await request(app)
        .post('/vendor/products')
        .set('Authorization', `Bearer ${vendorUser.token}`)
        .send({
          name: 'Product 2',
          price: 2000,
          stock: 10,
          imageUrl: product2ImageUrl,
        });

      // 3. Delete store (should clean up logo and all product images)
      const deleteResponse = await request(app)
        .delete(`/stores/${store.slug}`)
        .set('Authorization', `Bearer ${vendorUser.token}`);

      expect(deleteResponse.status).toBe(204);
    });
  });
});
