import { Router } from 'express';
import * as vendor from '../controllers/vendor.controller';
import { authGuard, requireVendor } from '../middlewares/auth';
import { registry } from '../lib/openapi';
// OpenAPI registration for vendor endpoints
registry.registerPath({
    method: 'get',
    path: '/vendor/dashboard',
    tags: ['vendor'],
    responses: {
        200: {
            description: 'Vendor dashboard overview',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            store: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    slug: { type: 'string' },
                                    logoUrl: { type: 'string' },
                                },
                            },
                            owner: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    role: { type: 'string' },
                                },
                            },
                            stats: {
                                type: 'object',
                                properties: {
                                    totalProducts: { type: 'number' },
                                    lowStockProducts: { type: 'number' },
                                    visibleProducts: { type: 'number' },
                                    hiddenProducts: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        404: {
            description: 'Store not found',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/products/stats',
    tags: ['vendor'],
    responses: {
        200: {
            description: 'Vendor product statistics',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            totalProducts: { type: 'number' },
                            visibleProducts: { type: 'number' },
                            hiddenProducts: { type: 'number' },
                            lowStockProducts: { type: 'number' },
                            outOfStockProducts: { type: 'number' },
                            totalValue: { type: 'number' },
                            stockHealth: {
                                type: 'object',
                                properties: {
                                    healthy: { type: 'number' },
                                    lowStock: { type: 'number' },
                                    outOfStock: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/store',
    tags: ['vendor'],
    responses: {
        200: {
            description: 'Vendor store details',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            logoUrl: { type: 'string' },
                            owner: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    role: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
});
registry.registerPath({
    method: 'put',
    path: '/vendor/store',
    tags: ['vendor'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            logoUrl: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Store updated successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            logoUrl: { type: 'string' },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        409: {
            description: 'Store slug already exists',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/products',
    tags: ['vendor'],
    responses: {
        200: {
            description: 'Vendor products list with sales data',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        price: { type: 'number' },
                                        stock: { type: 'number' },
                                        imageUrl: { type: 'string' },
                                        visibleMarket: { type: 'boolean' },
                                        storeId: { type: 'string' },
                                        salesData: {
                                            type: 'object',
                                            properties: {
                                                totalSold: { type: 'number' },
                                                totalRevenue: { type: 'number' },
                                                averagePrice: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                            meta: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                    page: { type: 'number' },
                                    pageSize: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        404: {
            description: 'Store not found',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/products/best-sellers',
    tags: ['vendor'],
    responses: {
        200: {
            description: 'Vendor best-selling products',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            period: { type: 'string' },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        price: { type: 'number' },
                                        stock: { type: 'number' },
                                        imageUrl: { type: 'string' },
                                        visibleMarket: { type: 'boolean' },
                                        salesData: {
                                            type: 'object',
                                            properties: {
                                                totalSold: { type: 'number' },
                                                totalRevenue: { type: 'number' },
                                                averagePrice: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                            meta: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        404: {
            description: 'Store not found',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
});
const r = Router();
// Vendor dashboard routes (all require authentication and vendor role)
r.get('/dashboard', authGuard, requireVendor, vendor.getVendorDashboard);
r.get('/products', authGuard, requireVendor, vendor.getVendorProducts);
r.get('/products/stats', authGuard, requireVendor, vendor.getVendorProductStats);
r.get('/products/best-sellers', authGuard, requireVendor, vendor.getVendorBestSellers);
r.get('/store', authGuard, requireVendor, vendor.getVendorStore);
r.put('/store', authGuard, requireVendor, vendor.updateVendorStore);
export default r;
