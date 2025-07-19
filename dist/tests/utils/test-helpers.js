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
import { app } from '../mocks/app';
import { prisma } from '../../src/lib/prisma';
/**
 * Create a test user and return authentication details
 */
export function createTestUser(email_1) {
    return __awaiter(this, arguments, void 0, function* (email, role = 'CUSTOMER') {
        // Register user
        yield request(app).post('/auth/register').send({ email, password: 'password123' });
        // Login to get token
        const loginResponse = yield request(app)
            .post('/auth/login')
            .send({ email, password: 'password123' });
        return {
            id: loginResponse.body.user.id,
            email,
            token: loginResponse.body.accessToken,
            role: loginResponse.body.user.role, // Use actual role from database
        };
    });
}
/**
 * Refresh user token to get updated role information
 */
export function refreshUserToken(email_1) {
    return __awaiter(this, arguments, void 0, function* (email, password = 'password123') {
        const loginResponse = yield request(app).post('/auth/login').send({ email, password });
        return loginResponse.body.accessToken;
    });
}
/**
 * Create a test store for a vendor
 */
export function createTestStore(vendorToken, storeData, userEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield request(app)
            .post('/stores')
            .set('Authorization', `Bearer ${vendorToken}`)
            .send(storeData);
        return {
            id: response.body.id,
            slug: response.body.slug,
            name: response.body.name,
            newToken: response.body.newToken, // Include the new token with updated role
        };
    });
}
/**
 * Create a test product for a store
 */
export function createTestProduct(vendorToken, productData) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield request(app)
            .post('/products')
            .set('Authorization', `Bearer ${vendorToken}`)
            .send(productData);
        return {
            id: response.body.id,
            name: response.body.name,
            storeId: response.body.storeId,
        };
    });
}
/**
 * Clean up test data
 */
export function cleanupTestData(userIds, storeIds) {
    return __awaiter(this, void 0, void 0, function* () {
        // Filter out undefined values
        const validStoreIds = storeIds.filter((id) => id !== undefined);
        const validUserIds = userIds.filter((id) => id !== undefined);
        if (validStoreIds.length > 0) {
            // Delete order items first (due to foreign key constraints)
            yield prisma.orderItem.deleteMany({
                where: {
                    product: {
                        storeId: { in: validStoreIds },
                    },
                },
            });
            // Delete orders
            yield prisma.order.deleteMany({
                where: {
                    storeId: { in: validStoreIds },
                },
            });
            // Delete products
            yield prisma.product.deleteMany({
                where: {
                    storeId: { in: validStoreIds },
                },
            });
            // Delete stores
            yield prisma.store.deleteMany({
                where: {
                    id: { in: validStoreIds },
                },
            });
        }
        if (validUserIds.length > 0) {
            // Delete users
            yield prisma.user.deleteMany({
                where: {
                    id: { in: validUserIds },
                },
            });
        }
    });
}
/**
 * Generate unique test data
 */
export function generateTestData() {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    return {
        vendorEmail: `vendor${timestamp}-${randomSuffix}@test.com`,
        customerEmail: `customer${timestamp}-${randomSuffix}@test.com`,
        storeName: `Test Store ${timestamp}-${randomSuffix}`,
        storeSlug: `test-store-${timestamp}-${randomSuffix}`,
        productName: `Test Product ${timestamp}-${randomSuffix}`,
    };
}
/**
 * Wait for a condition to be true
 */
export function waitFor(condition, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            if (condition()) {
                resolve();
            }
            else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            }
            else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}
/**
 * Create multiple test products for a store
 */
export function createMultipleProducts(vendorToken_1, count_1) {
    return __awaiter(this, arguments, void 0, function* (vendorToken, count, baseName = 'Test Product') {
        const products = [];
        for (let i = 0; i < count; i++) {
            const product = yield createTestProduct(vendorToken, {
                name: `${baseName} ${i + 1}`,
                price: 1000 + i * 500,
                stock: 10 + i,
                imageUrl: `https://example.com/product${i + 1}.jpg`,
            });
            products.push(product);
        }
        return products;
    });
}
/**
 * Verify that a resource exists
 */
export function verifyResourceExists(endpoint_1) {
    return __awaiter(this, arguments, void 0, function* (endpoint, expectedStatus = 200) {
        try {
            const response = yield request(app).get(endpoint);
            return response.status === expectedStatus;
        }
        catch (_a) {
            return false;
        }
    });
}
/**
 * Verify that a resource does not exist
 */
export function verifyResourceNotExists(endpoint_1) {
    return __awaiter(this, arguments, void 0, function* (endpoint, expectedStatus = 404) {
        try {
            const response = yield request(app).get(endpoint);
            return response.status === expectedStatus;
        }
        catch (_a) {
            return false;
        }
    });
}
