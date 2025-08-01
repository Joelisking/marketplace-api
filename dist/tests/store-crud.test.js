import request from 'supertest';
import { app } from './mocks/app';
import { cleanupTestData } from './utils/test-helpers';
describe('Store CRUD Operations', () => {
    let vendorToken;
    let vendorId;
    let storeId;
    let storeSlug;
    let otherVendorToken;
    let otherVendorId;
    let otherStoreId;
    let otherStoreSlug;
    // Test data
    const vendorEmail = `vendor${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
    const otherVendorEmail = `othervendor${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
    const storeData = {
        name: `Test Store ${Date.now()}`,
        slug: `test-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        logoUrl: 'https://example.com/logo.jpg',
    };
    beforeAll(async () => {
        // Create test vendor
        const vendorResponse = await request(app)
            .post('/auth/register')
            .send({ email: vendorEmail, password: 'password123' });
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ email: vendorEmail, password: 'password123' });
        vendorToken = loginResponse.body.accessToken;
        vendorId = loginResponse.body.user.id;
        // Create another vendor for authorization tests
        const otherVendorResponse = await request(app)
            .post('/auth/register')
            .send({ email: otherVendorEmail, password: 'password123' });
        const otherLoginResponse = await request(app)
            .post('/auth/login')
            .send({ email: otherVendorEmail, password: 'password123' });
        otherVendorToken = otherLoginResponse.body.accessToken;
        otherVendorId = otherLoginResponse.body.user.id;
    });
    afterAll(async () => {
        // Clean up test data
        await cleanupTestData([vendorId, otherVendorId], [storeId, otherStoreId]);
    });
    describe('POST /stores', () => {
        it('should create a store successfully', async () => {
            const response = await request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(storeData);
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                ...storeData,
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                },
            });
            expect(response.body.id).toBeDefined();
            storeId = response.body.id;
            storeSlug = response.body.slug;
            // Update token with the new token that includes VENDOR role
            if (response.body.newToken) {
                vendorToken = response.body.newToken;
            }
        });
        it('should fail without authentication', async () => {
            const response = await request(app).post('/stores').send(storeData);
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Missing token');
        });
        it('should fail if user already owns a store', async () => {
            const response = await request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({
                name: `Another Store ${Date.now()}`,
                slug: `another-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
            expect(response.status).toBe(409);
            expect(response.body.message).toBe('You already own a store');
        });
        it('should fail if slug already exists', async () => {
            const response = await request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send({
                name: `Different Store ${Date.now()}`,
                slug: storeSlug, // Use the same slug as the first store
            });
            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Store slug already exists');
        });
        it('should validate required fields', async () => {
            const invalidData = {
                name: '', // Invalid: empty name
                slug: 'invalid slug', // Invalid: contains space
                logoUrl: 'not-a-url', // Invalid: not a URL
            };
            const response = await request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send(invalidData);
            expect(response.status).toBe(400);
        });
        it('should validate slug format', async () => {
            const invalidSlugs = [
                'UPPERCASE', // Invalid: uppercase
                'with spaces', // Invalid: spaces
                'with@symbols', // Invalid: special characters
                'with_underscores', // Invalid: underscores
            ];
            for (const slug of invalidSlugs) {
                const response = await request(app)
                    .post('/stores')
                    .set('Authorization', `Bearer ${otherVendorToken}`)
                    .send({
                    name: 'Test Store',
                    slug,
                });
                expect(response.status).toBe(400);
            }
        });
    });
    describe('GET /stores/:slug', () => {
        it('should get a store by slug', async () => {
            const response = await request(app).get(`/stores/${storeSlug}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                ...storeData,
                id: storeId,
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                },
            });
        });
        it('should return 404 for non-existent store', async () => {
            const response = await request(app).get('/stores/non-existent-slug');
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Store not found');
        });
    });
    describe('PUT /stores/:slug', () => {
        it('should update a store successfully', async () => {
            const updateData = {
                name: 'Updated Store Name',
                logoUrl: 'https://example.com/updated-logo.jpg',
            };
            const response = await request(app)
                .put(`/stores/${storeSlug}`)
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                ...updateData,
                id: storeId,
                slug: storeSlug, // Should remain unchanged
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                },
            });
        });
        it('should update store slug successfully', async () => {
            const newSlug = `updated-slug-${Date.now()}`;
            const updateData = {
                slug: newSlug,
            };
            const response = await request(app)
                .put(`/stores/${storeSlug}`)
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body.slug).toBe(newSlug);
            // Update the slug for subsequent tests
            storeSlug = newSlug;
        });
        it('should fail without authentication', async () => {
            const response = await request(app)
                .put(`/stores/${storeSlug}`)
                .send({ name: 'Updated Name' });
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Missing token');
        });
    });
    describe('DELETE /stores/:slug', () => {
        it('should delete a store and its products successfully', async () => {
            // Create a temporary store for this test
            const tempStoreResponse = await request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send({
                name: `Temp Store for Delete ${Date.now()}`,
                slug: `temp-store-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
            const tempStoreSlug = tempStoreResponse.body.slug;
            const tempStoreId = tempStoreResponse.body.id;
            // Update token with the new token that includes VENDOR role
            if (tempStoreResponse.body.newToken) {
                otherVendorToken = tempStoreResponse.body.newToken;
            }
            // Verify store exists
            const getStoreResponse = await request(app).get(`/stores/${tempStoreSlug}`);
            expect(getStoreResponse.status).toBe(200);
            // Create a product for the temporary store
            const productResponse = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send({
                name: 'Test Product for Delete',
                price: 5000,
                stock: 10,
                imageUrl: 'https://example.com/product.jpg',
            });
            const productId = productResponse.body.id;
            // Verify product exists
            const getProductResponse = await request(app).get(`/products/${productId}`);
            expect(getProductResponse.status).toBe(200);
            // Delete the temporary store
            const response = await request(app)
                .delete(`/stores/${tempStoreSlug}`)
                .set('Authorization', `Bearer ${otherVendorToken}`);
            expect(response.status).toBe(204);
            // Verify store is deleted
            const getStoreAfterDeleteResponse = await request(app).get(`/stores/${tempStoreSlug}`);
            expect(getStoreAfterDeleteResponse.status).toBe(404);
            // Verify product is also deleted (cascading delete)
            const getProductAfterDeleteResponse = await request(app).get(`/products/${productId}`);
            expect(getProductAfterDeleteResponse.status).toBe(404);
        });
    });
    describe('GET /stores', () => {
        beforeEach(async () => {
            // Create some test stores if they don't exist
            if (!otherStoreId) {
                const otherStoreResponse = await request(app)
                    .post('/stores')
                    .set('Authorization', `Bearer ${otherVendorToken}`)
                    .send({
                    name: `Other Store ${Date.now()}`,
                    slug: `other-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                });
                otherStoreId = otherStoreResponse.body.id;
                otherStoreSlug = otherStoreResponse.body.slug;
                // Update token with the new token that includes VENDOR role
                if (otherStoreResponse.body.newToken) {
                    otherVendorToken = otherStoreResponse.body.newToken;
                }
            }
        });
        it('should list stores with pagination', async () => {
            const response = await request(app).get('/stores?page=1&limit=2');
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(2);
            expect(response.body.meta).toMatchObject({
                total: expect.any(Number),
                page: 1,
                pageSize: 2,
            });
        });
        it('should filter stores by search query', async () => {
            const response = await request(app).get('/stores?q=Store');
            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeGreaterThan(0);
        });
    });
});
