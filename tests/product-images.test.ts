import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser, createTestStore, createTestProduct } from './utils/test-helpers';

describe('Product Images API', () => {
  let vendorToken: string;
  let customerToken: string;
  let vendorId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    // Create test users
    const vendor = await createTestUser('vendor@test.com', 'VENDOR');
    const customer = await createTestUser('customer@test.com', 'CUSTOMER');

    vendorId = vendor.id;
    vendorToken = vendor.token;
    customerToken = customer.token;

    // Create test store for vendor
    const store = await createTestStore(vendorToken, {
      name: 'Test Store',
      slug: 'test-store',
    });
    storeId = store.id;

    // Create test product
    const product = await createTestProduct(vendorToken, {
      name: 'Test Product',
      price: 2500,
      stock: 10,
      imageUrl: 'https://example.com/product.jpg',
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /vendor/products/:productId/images', () => {
    it('should add images to a product', async () => {
      const imageData = [
        {
          fileName: 'uploads/test-image-1.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-1.jpg',
          altText: 'Test image 1',
          isPrimary: true,
          sortOrder: 0,
        },
        {
          fileName: 'uploads/test-image-2.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-2.jpg',
          altText: 'Test image 2',
          isPrimary: false,
          sortOrder: 1,
        },
      ];

      const response = await request(app)
        .post(`/vendor/products/${productId}/images`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(imageData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: '2 images added successfully',
        addedCount: 2,
      });

      // Verify images were created in database
      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });

      expect(images).toHaveLength(2);
      expect(images[0]).toMatchObject({
        fileName: 'uploads/test-image-1.jpg',
        fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-1.jpg',
        altText: 'Test image 1',
        isPrimary: true,
        sortOrder: 0,
      });
      expect(images[1]).toMatchObject({
        fileName: 'uploads/test-image-2.jpg',
        fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-2.jpg',
        altText: 'Test image 2',
        isPrimary: false,
        sortOrder: 1,
      });

      // Verify product's primary imageUrl was updated
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.imageUrl).toBe(
        'http://localhost:9000/marketplace-images/uploads/test-image-1.jpg',
      );
    });

    it('should automatically set first image as primary if no primary specified', async () => {
      const imageData = [
        {
          fileName: 'uploads/test-image-3.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-3.jpg',
          altText: 'Test image 3',
          sortOrder: 0,
        },
      ];

      await request(app)
        .post(`/vendor/products/${productId}/images`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(imageData)
        .expect(201);

      const images = await prisma.productImage.findMany({
        where: {
          productId,
          fileName: 'uploads/test-image-3.jpg',
        },
      });

      expect(images[0].isPrimary).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const imageData = [
        {
          fileName: 'uploads/test-image.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image.jpg',
        },
      ];

      await request(app).post(`/vendor/products/${productId}/images`).send(imageData).expect(401);
    });

    it('should reject customer access', async () => {
      const imageData = [
        {
          fileName: 'uploads/test-image.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image.jpg',
        },
      ];

      await request(app)
        .post(`/vendor/products/${productId}/images`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(imageData)
        .expect(403);
    });

    it("should reject access to other vendor's product", async () => {
      // Create another vendor and product
      const otherVendor = await createTestUser('othervendor@test.com', 'VENDOR');
      const otherStore = await createTestStore(otherVendor.token, {
        name: 'Other Store',
        slug: 'other-store',
      });
      const otherProduct = await createTestProduct(otherVendor.token, {
        name: 'Other Product',
        price: 3000,
        stock: 5,
        imageUrl: 'https://example.com/other-product.jpg',
      });

      const imageData = [
        {
          fileName: 'uploads/test-image.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image.jpg',
        },
      ];

      await request(app)
        .post(`/vendor/products/${otherProduct.id}/images`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(imageData)
        .expect(404);

      // Cleanup
      await prisma.product.delete({ where: { id: otherProduct.id } });
      await prisma.store.delete({ where: { id: otherStore.id } });
      await prisma.user.delete({ where: { id: otherVendor.id } });
    });
  });

  describe('GET /vendor/products/:productId/images', () => {
    it('should get all images for a product', async () => {
      const response = await request(app)
        .get(`/vendor/products/${productId}/images`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const image = response.body[0];
      expect(image).toHaveProperty('id');
      expect(image).toHaveProperty('productId', productId);
      expect(image).toHaveProperty('fileName');
      expect(image).toHaveProperty('fileUrl');
      expect(image).toHaveProperty('isPrimary');
      expect(image).toHaveProperty('sortOrder');
      expect(image).toHaveProperty('createdAt');
    });

    it('should reject unauthorized access', async () => {
      await request(app).get(`/vendor/products/${productId}/images`).expect(401);
    });
  });

  describe('PUT /vendor/products/:productId/images/:imageId', () => {
    let imageId: string;

    beforeAll(async () => {
      const image = await prisma.productImage.findFirst({
        where: { productId },
      });
      imageId = image!.id;
    });

    it('should update an image', async () => {
      const updateData = {
        altText: 'Updated alt text',
        isPrimary: false,
      };

      const response = await request(app)
        .put(`/vendor/products/${productId}/images/${imageId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: imageId,
        productId,
        altText: 'Updated alt text',
        isPrimary: false,
      });
    });

    it('should set a new primary image', async () => {
      // First, create another image
      const newImage = await prisma.productImage.create({
        data: {
          productId,
          fileName: 'uploads/test-image-4.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-4.jpg',
          altText: 'Test image 4',
          isPrimary: false,
          sortOrder: 10,
        },
      });

      const updateData = {
        isPrimary: true,
      };

      await request(app)
        .put(`/vendor/products/${productId}/images/${newImage.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(updateData)
        .expect(200);

      // Verify old primary was unset
      const oldImage = await prisma.productImage.findUnique({
        where: { id: imageId },
      });
      expect(oldImage?.isPrimary).toBe(false);

      // Verify new primary was set
      const updatedImage = await prisma.productImage.findUnique({
        where: { id: newImage.id },
      });
      expect(updatedImage?.isPrimary).toBe(true);

      // Verify product's primary imageUrl was updated
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.imageUrl).toBe(newImage.fileUrl);
    });

    it('should reject unauthorized access', async () => {
      const updateData = {
        altText: 'Updated alt text',
      };

      await request(app)
        .put(`/vendor/products/${productId}/images/${imageId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /vendor/products/:productId/images/:imageId', () => {
    let imageToDelete: string;

    beforeAll(async () => {
      // Create an image to delete
      const image = await prisma.productImage.create({
        data: {
          productId,
          fileName: 'uploads/test-image-to-delete.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-to-delete.jpg',
          altText: 'Image to delete',
          isPrimary: false,
          sortOrder: 100,
        },
      });
      imageToDelete = image.id;
    });

    it('should delete an image', async () => {
      await request(app)
        .delete(`/vendor/products/${productId}/images/${imageToDelete}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(204);

      // Verify image was deleted
      const deletedImage = await prisma.productImage.findUnique({
        where: { id: imageToDelete },
      });
      expect(deletedImage).toBeNull();
    });

    it('should set new primary when deleting primary image', async () => {
      // Create a primary image to delete
      const primaryImage = await prisma.productImage.create({
        data: {
          productId,
          fileName: 'uploads/test-primary-to-delete.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-primary-to-delete.jpg',
          altText: 'Primary to delete',
          isPrimary: true,
          sortOrder: 200,
        },
      });

      // Create another image that should become primary
      const secondaryImage = await prisma.productImage.create({
        data: {
          productId,
          fileName: 'uploads/test-secondary.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-secondary.jpg',
          altText: 'Secondary image',
          isPrimary: false,
          sortOrder: 201,
        },
      });

      await request(app)
        .delete(`/vendor/products/${productId}/images/${primaryImage.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(204);

      // Verify secondary image became primary
      const updatedSecondary = await prisma.productImage.findUnique({
        where: { id: secondaryImage.id },
      });
      expect(updatedSecondary?.isPrimary).toBe(true);

      // Verify product's primary imageUrl was updated
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.imageUrl).toBe(secondaryImage.fileUrl);
    });

    it('should reject unauthorized access', async () => {
      const image = await prisma.productImage.create({
        data: {
          productId,
          fileName: 'uploads/test-image-unauthorized.jpg',
          fileUrl: 'http://localhost:9000/marketplace-images/uploads/test-image-unauthorized.jpg',
          altText: 'Unauthorized image',
          isPrimary: false,
          sortOrder: 300,
        },
      });

      await request(app).delete(`/vendor/products/${productId}/images/${image.id}`).expect(401);
    });
  });

  describe('PUT /vendor/products/:productId/images/reorder', () => {
    let imageIds: string[];

    beforeAll(async () => {
      // Get existing images
      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      imageIds = images.map((img) => img.id);
    });

    it('should reorder images', async () => {
      // Reverse the order
      const newOrder = [...imageIds].reverse();

      await request(app)
        .put(`/vendor/products/${productId}/images/reorder`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ imageIds: newOrder })
        .expect(200);

      // Verify new order
      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });

      expect(images.map((img) => img.id)).toEqual(newOrder);
    });

    it('should reject invalid image IDs', async () => {
      const invalidOrder = [...imageIds, 'invalid-id'];

      await request(app)
        .put(`/vendor/products/${productId}/images/reorder`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ imageIds: invalidOrder })
        .expect(400);
    });

    it('should reject unauthorized access', async () => {
      await request(app)
        .put(`/vendor/products/${productId}/images/reorder`)
        .send({ imageIds: imageIds })
        .expect(401);
    });
  });
});
