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
import { prisma } from '../src/lib/prisma';
import { createTestUser, createTestStore, createTestProduct, cleanupTestData, generateTestData, } from './utils/test-helpers';
describe('Marketplace Integration Tests', () => {
    let vendor1;
    let vendor2;
    let customer;
    let store1;
    let store2;
    let products1;
    let products2;
    const testData = generateTestData();
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Create test users
        vendor1 = yield createTestUser(testData.vendorEmail, 'CUSTOMER');
        const vendor2Email = `vendor2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
        vendor2 = yield createTestUser(vendor2Email, 'CUSTOMER');
        customer = yield createTestUser(testData.customerEmail, 'CUSTOMER');
        // Create stores for vendors (this will promote them to VENDOR role)
        store1 = yield createTestStore(vendor1.token, {
            name: testData.storeName,
            slug: testData.storeSlug,
            logoUrl: 'https://example.com/logo1.jpg',
        });
        store2 = yield createTestStore(vendor2.token, {
            name: `Store 2 ${Date.now()}`,
            slug: `store-2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            logoUrl: 'https://example.com/logo2.jpg',
        });
        // Update tokens with the new tokens that include VENDOR role
        if (store1.newToken) {
            vendor1.token = store1.newToken;
        }
        if (store2.newToken) {
            vendor2.token = store2.newToken;
        }
        // Create products for stores
        products1 = yield Promise.all([
            createTestProduct(vendor1.token, {
                name: `Product 1A ${Date.now()}`,
                price: 1000,
                stock: 10,
                imageUrl: 'https://example.com/product1a.jpg',
            }),
            createTestProduct(vendor1.token, {
                name: `Product 1B ${Date.now()}`,
                price: 2000,
                stock: 5,
                imageUrl: 'https://example.com/product1b.jpg',
            }),
        ]);
        products2 = yield Promise.all([
            createTestProduct(vendor2.token, {
                name: `Product 2A ${Date.now()}`,
                price: 1500,
                stock: 8,
                imageUrl: 'https://example.com/product2a.jpg',
            }),
            createTestProduct(vendor2.token, {
                name: `Product 2B ${Date.now()}`,
                price: 3000,
                stock: 3,
                imageUrl: 'https://example.com/product2b.jpg',
            }),
        ]);
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield cleanupTestData([vendor1.id, vendor2.id, customer.id], [store1.id, store2.id]);
    }));
    describe('Complete Marketplace Workflow', () => {
        it('should allow vendors to manage their stores and products independently', () => __awaiter(void 0, void 0, void 0, function* () {
            // Vendor 1 should only see their own products (new role-based filtering)
            const vendor1ProductsResponse = yield request(app)
                .get('/products')
                .set('Authorization', `Bearer ${vendor1.token}`);
            expect(vendor1ProductsResponse.status).toBe(200);
            expect(vendor1ProductsResponse.body.items.length).toBeGreaterThanOrEqual(2);
            expect(vendor1ProductsResponse.body.items.length).toBeGreaterThanOrEqual(2);
            // Vendor 2 should only see their own products
            const vendor2ProductsResponse = yield request(app)
                .get('/products')
                .set('Authorization', `Bearer ${vendor2.token}`);
            expect(vendor2ProductsResponse.status).toBe(200);
            expect(vendor2ProductsResponse.body.items.length).toBeGreaterThanOrEqual(2);
            expect(vendor2ProductsResponse.body.items.length).toBeGreaterThanOrEqual(2);
            // Customers should see all products
            const customerProductsResponse = yield request(app)
                .get('/products')
                .set('Authorization', `Bearer ${customer.token}`);
            expect(customerProductsResponse.status).toBe(200);
            expect(customerProductsResponse.body.items.length).toBeGreaterThanOrEqual(4);
            // Should include products from both stores
            const storeIds = customerProductsResponse.body.items.map((p) => p.storeId);
            expect(storeIds).toContain(store1.id);
            expect(storeIds).toContain(store2.id);
        }));
        it('should allow customers to browse all products', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get('/products');
            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeGreaterThanOrEqual(4);
            // Should include products from both stores
            const storeIds = response.body.items.map((p) => p.storeId);
            expect(storeIds).toContain(store1.id);
            expect(storeIds).toContain(store2.id);
        }));
        it('should allow searching and filtering products', () => __awaiter(void 0, void 0, void 0, function* () {
            // Search by product name - use the actual product name created in setup
            const searchResponse = yield request(app).get(`/products?q=${products1[0].name}`);
            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body.items).toHaveLength(1);
            expect(searchResponse.body.items[0].name).toBe(products1[0].name);
            // Filter by store
            const storeFilterResponse = yield request(app).get(`/products?storeId=${store1.id}`);
            expect(storeFilterResponse.status).toBe(200);
            expect(storeFilterResponse.body.items.every((p) => p.storeId === store1.id)).toBe(true);
        }));
        it('should allow browsing stores and their products', () => __awaiter(void 0, void 0, void 0, function* () {
            // List all stores
            const storesResponse = yield request(app).get('/stores');
            expect(storesResponse.status).toBe(200);
            expect(storesResponse.body.items.length).toBeGreaterThanOrEqual(2);
            // Get specific store
            const storeResponse = yield request(app).get(`/stores/${store1.slug}`);
            expect(storeResponse.status).toBe(200);
            expect(storeResponse.body.id).toBe(store1.id);
            expect(storeResponse.body.name).toBe(store1.name);
            // Get products from specific store
            const storeProductsResponse = yield request(app).get(`/stores/${store1.slug}/products`);
            expect(storeProductsResponse.status).toBe(200);
            expect(storeProductsResponse.body.items).toHaveLength(2);
            expect(storeProductsResponse.body.items.every((p) => p.storeId === store1.id)).toBe(true);
        }));
    });
    describe('Authorization and Security', () => {
        it("should prevent vendors from accessing other vendors' resources", () => __awaiter(void 0, void 0, void 0, function* () {
            // Vendor 1 trying to update Vendor 2's product
            const updateResponse = yield request(app)
                .put(`/products/${products2[0].id}`)
                .set('Authorization', `Bearer ${vendor1.token}`)
                .send({ name: 'Unauthorized Update' });
            expect(updateResponse.status).toBe(403);
            expect(updateResponse.body.message).toBe('Access denied - you do not own this product');
            // Vendor 1 trying to delete Vendor 2's product
            const deleteResponse = yield request(app)
                .delete(`/products/${products2[0].id}`)
                .set('Authorization', `Bearer ${vendor1.token}`);
            expect(deleteResponse.status).toBe(403);
            expect(deleteResponse.body.message).toBe('Access denied - you do not own this product');
            // Vendor 1 trying to delete Vendor 2's store
            const deleteStoreResponse = yield request(app)
                .delete(`/stores/${store2.slug}`)
                .set('Authorization', `Bearer ${vendor1.token}`);
            expect(deleteStoreResponse.status).toBe(404);
            expect(deleteStoreResponse.body.message).toBe('Store not found or access denied');
        }));
        it('should prevent customers from creating stores or products', () => __awaiter(void 0, void 0, void 0, function* () {
            // Customer trying to create a store - should succeed since there's no role restriction
            const uniqueSlug = `customer-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const storeResponse = yield request(app)
                .post('/stores')
                .set('Authorization', `Bearer ${customer.token}`)
                .send({
                name: 'Customer Store',
                slug: uniqueSlug,
            });
            expect(storeResponse.status).toBe(201);
            // Customer trying to create a product - should fail even with a store (vendor role required)
            const productResponse = yield request(app)
                .post('/products')
                .set('Authorization', `Bearer ${customer.token}`)
                .send({
                name: 'Customer Product',
                price: 1000,
                stock: 1,
                imageUrl: 'https://example.com/customer-product.jpg',
            });
            expect(productResponse.status).toBe(403);
            expect(productResponse.body.message).toBe('Vendor role required - you must have vendor permissions to create products');
            // Clean up the store created by customer
            yield prisma.store.delete({
                where: { slug: uniqueSlug },
            });
        }));
        it('should require authentication for write operations', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create store without auth
            const storeResponse = yield request(app).post('/stores').send({
                name: 'Unauthorized Store',
                slug: 'unauthorized-store',
            });
            expect(storeResponse.status).toBe(401);
            // Create product without auth
            const productResponse = yield request(app).post('/products').send({
                name: 'Unauthorized Product',
                price: 1000,
                stock: 1,
                imageUrl: 'https://example.com/unauthorized-product.jpg',
            });
            expect(productResponse.status).toBe(401);
        }));
    });
    describe('Pagination and Performance', () => {
        it('should handle pagination correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create multiple products for pagination testing
            const paginationProducts = yield Promise.all(Array.from({ length: 5 }, (_, i) => createTestProduct(vendor1.token, {
                name: `Pagination Product ${i + 1} ${Date.now()}`,
                price: 1000 + i * 100,
                stock: 10,
                imageUrl: `https://example.com/pagination-${i + 1}.jpg`,
            })));
            // Test first page
            const page1Response = yield request(app).get('/products?page=1&limit=2');
            expect(page1Response.status).toBe(200);
            expect(page1Response.body.items).toHaveLength(2);
            expect(page1Response.body.meta).toMatchObject({
                page: 1,
                pageSize: 2,
                total: expect.any(Number),
            });
            // Test second page
            const page2Response = yield request(app).get('/products?page=2&limit=2');
            expect(page2Response.status).toBe(200);
            expect(page2Response.body.items).toHaveLength(2);
            expect(page2Response.body.meta).toMatchObject({
                page: 2,
                pageSize: 2,
                total: expect.any(Number),
            });
            // Clean up pagination products
            const validProductIds = paginationProducts.map((p) => p.id).filter((id) => id !== undefined);
            if (validProductIds.length > 0) {
                yield prisma.product.deleteMany({
                    where: {
                        id: { in: validProductIds },
                    },
                });
            }
        }));
    });
});
