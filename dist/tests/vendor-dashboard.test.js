import request from 'supertest';
import { app } from './mocks/app';
import { prisma } from '../src/lib/prisma';
import { createTestUser, createTestStore, cleanupTestData } from './utils/test-helpers';
describe('Vendor Dashboard Endpoints', () => {
    let vendorToken;
    let vendorId;
    let storeId;
    const vendorEmail = `vendor-dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
    beforeAll(async () => {
        // Create test vendor and store
        const vendor = await createTestUser(vendorEmail, 'CUSTOMER');
        vendorId = vendor.id;
        vendorToken = vendor.token;
        // Create store (this will promote user to VENDOR role)
        const store = await createTestStore(vendorToken, {
            name: 'Dashboard Test Store',
            slug: `dashboard-test-store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            logoUrl: 'https://example.com/logo.jpg',
        });
        storeId = store.id;
        // Update token with the new token that includes VENDOR role
        if (store.newToken) {
            vendorToken = store.newToken;
        }
        // Create some test products
        await request(app).post('/products').set('Authorization', `Bearer ${vendorToken}`).send({
            name: 'Test Product 1',
            price: 1000,
            stock: 5,
            imageUrl: 'https://example.com/product1.jpg',
            visibleMarket: true,
        });
        await request(app).post('/products').set('Authorization', `Bearer ${vendorToken}`).send({
            name: 'Test Product 2',
            price: 2000,
            stock: 15,
            imageUrl: 'https://example.com/product2.jpg',
            visibleMarket: true,
        });
        await request(app).post('/products').set('Authorization', `Bearer ${vendorToken}`).send({
            name: 'Hidden Product',
            price: 500,
            stock: 3,
            imageUrl: 'https://example.com/hidden.jpg',
            visibleMarket: false,
        });
    });
    afterAll(async () => {
        await cleanupTestData([vendorId], [storeId]);
    });
    describe('GET /vendor/dashboard', () => {
        it('should get vendor dashboard overview', async () => {
            const response = await request(app)
                .get('/vendor/dashboard')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                store: {
                    id: storeId,
                    name: 'Dashboard Test Store',
                    slug: expect.any(String),
                },
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                    role: 'VENDOR',
                },
                stats: {
                    totalProducts: 3,
                    visibleProducts: 2,
                    hiddenProducts: 1,
                    lowStockProducts: expect.any(Number),
                },
            });
        });
        it('should fail without authentication', async () => {
            const response = await request(app).get('/vendor/dashboard');
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Missing token');
        });
        it('should fail for non-vendor users', async () => {
            // Create a customer user
            const customer = await createTestUser(`customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`, 'CUSTOMER');
            const response = await request(app)
                .get('/vendor/dashboard')
                .set('Authorization', `Bearer ${customer.token}`);
            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Vendor role required - you must have vendor permissions to create products');
            // Clean up
            await prisma.user.delete({ where: { id: customer.id } });
        });
    });
    describe('GET /vendor/products', () => {
        it('should get vendor products with pagination', async () => {
            const response = await request(app)
                .get('/vendor/products?page=1&limit=10')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(3);
            expect(response.body.meta).toMatchObject({
                total: 3,
                page: 1,
                pageSize: 10,
            });
            expect(response.body.items.every((p) => p.storeId === storeId)).toBe(true);
        });
        it('should filter vendor products by search', async () => {
            const response = await request(app)
                .get('/vendor/products?q=Test Product')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(2);
            expect(response.body.items.every((p) => p.name.includes('Test Product'))).toBe(true);
        });
    });
    describe('GET /vendor/products/stats', () => {
        it('should get vendor product statistics', async () => {
            const response = await request(app)
                .get('/vendor/products/stats')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                totalProducts: 3,
                visibleProducts: 2,
                hiddenProducts: 1,
                lowStockProducts: expect.any(Number),
                outOfStockProducts: 0,
                totalValue: 3500, // 1000 + 2000 + 500
                stockHealth: {
                    healthy: expect.any(Number),
                    lowStock: expect.any(Number),
                    outOfStock: 0,
                },
            });
        });
    });
    describe('GET /vendor/store', () => {
        it('should get vendor store details', async () => {
            const response = await request(app)
                .get('/vendor/store')
                .set('Authorization', `Bearer ${vendorToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                id: storeId,
                name: 'Dashboard Test Store',
                slug: expect.any(String),
                logoUrl: 'https://example.com/logo.jpg',
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                    role: 'VENDOR',
                },
            });
        });
    });
    describe('PUT /vendor/store', () => {
        it('should update vendor store', async () => {
            const updateData = {
                name: 'Updated Dashboard Store',
                logoUrl: 'https://example.com/updated-logo.jpg',
            };
            const response = await request(app)
                .put('/vendor/store')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                id: storeId,
                name: 'Updated Dashboard Store',
                logoUrl: 'https://example.com/updated-logo.jpg',
                owner: {
                    id: vendorId,
                    email: vendorEmail,
                    role: 'VENDOR',
                },
            });
        });
        it('should fail with invalid data', async () => {
            const response = await request(app)
                .put('/vendor/store')
                .set('Authorization', `Bearer ${vendorToken}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('At least one field must be provided');
        });
    });
});
