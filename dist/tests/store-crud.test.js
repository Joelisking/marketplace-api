var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Create test vendor
        const vendorResponse = yield request(app)
            .post('/auth/register')
            .send({ email: vendorEmail, password: 'password123' });
        const loginResponse = yield request(app)
            .post('/auth/login')
            .send({ email: vendorEmail, password: 'password123' });
        vendorToken = loginResponse.body.accessToken;
        vendorId = loginResponse.body.user.id;
        // Create another vendor for authorization tests
        const otherVendorResponse = yield request(app)
            .post('/auth/register')
            .send({ email: otherVendorEmail, password: 'password123' });
        const otherLoginResponse = yield request(app)
            .post('/auth/login')
            .send({ email: otherVendorEmail, password: 'password123' });
        otherVendorToken = otherLoginResponse.body.accessToken;
        otherVendorId = otherLoginResponse.body.user.id;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up test data
        yield cleanupTestData([vendorId, otherVendorId], [storeId, otherStoreId]);
    }));
    describe('POST /stores', () => {
        it('should create a store successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(storeData);
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(Object.assign(Object.assign({}, storeData), { owner: {
                    id: vendorId,
                    email: vendorEmail,
                } }));
            expect(response.body.id).toBeDefined();
            storeId = response.body.id;
            storeSlug = response.body.slug;
            // Update token with the new token that includes VENDOR role
            if (response.body.newToken) {
                vendorToken = response.body.newToken;
            }
        }));
        it('should fail without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).post('/stores').send(storeData);
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Missing token');
        }));
        it('should fail if user already owns a store', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({
                name: `Another Store ${Date.now()}`,
                slug: `another-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
            expect(response.status).toBe(409);
            expect(response.body.message).toBe('You already own a store');
        }));
        it('should fail if slug already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send({
                name: `Different Store ${Date.now()}`,
                slug: storeSlug, // Use the same slug as the first store
            });
            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Store slug already exists');
        }));
        it('should validate required fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidData = {
                name: '', // Invalid: empty name
                slug: 'invalid slug', // Invalid: contains space
                logoUrl: 'not-a-url', // Invalid: not a URL
            };
            const response = yield request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${otherVendorToken}`)
                .send(invalidData);
            expect(response.status).toBe(400);
        }));
        it('should validate slug format', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidSlugs = [
                'UPPERCASE', // Invalid: uppercase
                'with spaces', // Invalid: spaces
                'with@symbols', // Invalid: special characters
                'with_underscores', // Invalid: underscores
            ];
            for (const slug of invalidSlugs) {
                const response = yield request(app)
                    .post('/stores')
                    .set('Authorization', `Bearer ${otherVendorToken}`)
                    .send({
                    name: 'Test Store',
                    slug,
                });
                expect(response.status).toBe(400);
            }
        }));
    });
    describe('GET /stores/:slug', () => {
        it('should get a store by slug', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get(`/stores/${storeSlug}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(Object.assign(Object.assign({}, storeData), { id: storeId, owner: {
                    id: vendorId,
                    email: vendorEmail,
                } }));
        }));
        it('should return 404 for non-existent store', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get('/stores/non-existent-slug');
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Store not found');
        }));
    });
    describe('PUT /stores/:slug', () => {
        it('should update a store successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const updateData = {
                name: 'Updated Store Name',
                logoUrl: 'https://example.com/updated-logo.jpg',
            };
            const response = yield request(app)
                .put(`/stores/${storeSlug}`)
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(Object.assign(Object.assign({}, updateData), { id: storeId, slug: storeSlug, owner: {
                    id: vendorId,
                    email: vendorEmail,
                } }));
        }));
        it('should update store slug successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const newSlug = `updated-slug-${Date.now()}`;
            const updateData = {
                slug: newSlug,
            };
            const response = yield request(app)
                .put(`/stores/${storeSlug}`)
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body.slug).toBe(newSlug);
            // Update the slug for subsequent tests
            storeSlug = newSlug;
        }));
        it('should fail without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .put(`/stores/${storeSlug}`)
                .send({ name: 'Updated Name' });
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Missing token');
        }));
    });
    describe('DELETE /stores/:slug', () => {
        it('should delete a store and its products successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a temporary store for this test
            const tempStoreResponse = yield request(app)
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
            const getStoreResponse = yield request(app).get(`/stores/${tempStoreSlug}`);
            expect(getStoreResponse.status).toBe(200);
            // Create a product for the temporary store
            const productResponse = yield request(app)
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
            const getProductResponse = yield request(app).get(`/products/${productId}`);
            expect(getProductResponse.status).toBe(200);
            // Delete the temporary store
            const response = yield request(app)
                .delete(`/stores/${tempStoreSlug}`)
                .set('Authorization', `Bearer ${otherVendorToken}`);
            expect(response.status).toBe(204);
            // Verify store is deleted
            const getStoreAfterDeleteResponse = yield request(app).get(`/stores/${tempStoreSlug}`);
            expect(getStoreAfterDeleteResponse.status).toBe(404);
            // Verify product is also deleted (cascading delete)
            const getProductAfterDeleteResponse = yield request(app).get(`/products/${productId}`);
            expect(getProductAfterDeleteResponse.status).toBe(404);
        }));
    });
    describe('GET /stores', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            // Create some test stores if they don't exist
            if (!otherStoreId) {
                const otherStoreResponse = yield request(app)
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
        }));
        it('should list stores with pagination', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get('/stores?page=1&limit=2');
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(2);
            expect(response.body.meta).toMatchObject({
                total: expect.any(Number),
                page: 1,
                pageSize: 2,
            });
        }));
        it('should filter stores by search query', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get('/stores?q=Store');
            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeGreaterThan(0);
        }));
    });
});
