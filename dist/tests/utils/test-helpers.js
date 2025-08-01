import request from 'supertest';
import { app } from '../mocks/app';
import { prisma } from '../../src/lib/prisma';
/**
 * Create a test user and return authentication details
 */
export async function createTestUser(email, role = 'CUSTOMER') {
    // Register user
    await request(app).post('/auth/register').send({ email, password: 'password123' });
    // Login to get token
    const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email, password: 'password123' });
    return {
        id: loginResponse.body.user.id,
        email,
        token: loginResponse.body.accessToken,
        role: loginResponse.body.user.role, // Use actual role from database
    };
}
/**
 * Refresh user token to get updated role information
 */
export async function refreshUserToken(email, password = 'password123') {
    const loginResponse = await request(app).post('/auth/login').send({ email, password });
    return loginResponse.body.accessToken;
}
/**
 * Create a test store for a vendor
 */
export async function createTestStore(vendorToken, storeData, userEmail) {
    const response = await request(app)
        .post('/stores')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(storeData);
    return {
        id: response.body.id,
        slug: response.body.slug,
        name: response.body.name,
        newToken: response.body.newToken, // Include the new token with updated role
    };
}
/**
 * Create a test product for a store
 */
export async function createTestProduct(vendorToken, productData) {
    const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(productData);
    return {
        id: response.body.id,
        name: response.body.name,
        storeId: response.body.storeId,
    };
}
/**
 * Clean up test data
 */
export async function cleanupTestData(userIds, storeIds) {
    // Filter out undefined values
    const validStoreIds = storeIds.filter((id) => id !== undefined);
    const validUserIds = userIds.filter((id) => id !== undefined);
    if (validStoreIds.length > 0) {
        // Delete order items first (due to foreign key constraints)
        await prisma.orderItem.deleteMany({
            where: {
                product: {
                    storeId: { in: validStoreIds },
                },
            },
        });
        // Delete orders
        await prisma.order.deleteMany({
            where: {
                storeId: { in: validStoreIds },
            },
        });
        // Delete products
        await prisma.product.deleteMany({
            where: {
                storeId: { in: validStoreIds },
            },
        });
        // Delete stores
        await prisma.store.deleteMany({
            where: {
                id: { in: validStoreIds },
            },
        });
    }
    if (validUserIds.length > 0) {
        // Delete users
        await prisma.user.deleteMany({
            where: {
                id: { in: validUserIds },
            },
        });
    }
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
export async function createMultipleProducts(vendorToken, count, baseName = 'Test Product') {
    const products = [];
    for (let i = 0; i < count; i++) {
        const product = await createTestProduct(vendorToken, {
            name: `${baseName} ${i + 1}`,
            price: 1000 + i * 500,
            stock: 10 + i,
            imageUrl: `https://example.com/product${i + 1}.jpg`,
        });
        products.push(product);
    }
    return products;
}
/**
 * Verify that a resource exists
 */
export async function verifyResourceExists(endpoint, expectedStatus = 200) {
    try {
        const response = await request(app).get(endpoint);
        return response.status === expectedStatus;
    }
    catch {
        return false;
    }
}
/**
 * Verify that a resource does not exist
 */
export async function verifyResourceNotExists(endpoint, expectedStatus = 404) {
    try {
        const response = await request(app).get(endpoint);
        return response.status === expectedStatus;
    }
    catch {
        return false;
    }
}
