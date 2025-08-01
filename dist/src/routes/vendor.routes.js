/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import * as vendor from '../controllers/vendor.controller';
import * as vendorAnalytics from '../controllers/vendor-analytics.controller';
import { authGuard, requireVendor } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import { z } from 'zod';
import { createVendorPaystackAccount, updateVendorPaystackAccount, getVendorPaystackAccount, listVendorPaystackAccounts, getVendorSettlements, processVendorPayouts, getVendorEarnings, getVendorPayoutHistory, CreateVendorAccountSchema, UpdateVendorAccountSchema, } from '../services/vendor-payment.service';
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
                                type: ['object', 'null'],
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
                                    storeId: { type: ['string', 'null'] },
                                    firstName: { type: ['string', 'null'] },
                                    lastName: { type: ['string', 'null'] },
                                    phone: { type: ['string', 'null'] },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: ['string', 'null'], format: 'date-time' },
                                },
                            },
                            stats: {
                                type: 'object',
                                properties: {
                                    totalProducts: { type: 'number' },
                                    lowStockProducts: { type: 'number' },
                                    visibleProducts: { type: 'number' },
                                    hiddenProducts: { type: 'number' },
                                    totalOrders: { type: 'number' },
                                    totalRevenue: { type: 'number' },
                                    totalItemsSold: { type: 'number' },
                                },
                            },
                            recentOrders: { type: 'array', items: { type: 'object' } },
                            message: { type: 'string' },
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
// Vendor Analytics OpenAPI documentation
registry.registerPath({
    method: 'get',
    path: '/vendor/analytics',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: 'Vendor analytics retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            period: { type: 'string' },
                            revenue: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                    average: { type: 'number' },
                                    growth: { type: 'number' },
                                    byDay: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                date: { type: 'string' },
                                                amount: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                            orders: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                    average: { type: 'number' },
                                    growth: { type: 'number' },
                                    byStatus: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string' },
                                                count: { type: 'number' },
                                                percentage: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                            products: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                    active: { type: 'number' },
                                    lowStock: { type: 'number' },
                                    outOfStock: { type: 'number' },
                                    bestSellers: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                productId: { type: 'string' },
                                                name: { type: 'string' },
                                                sales: { type: 'number' },
                                                revenue: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                            customers: {
                                type: 'object',
                                properties: {
                                    total: { type: 'number' },
                                    new: { type: 'number' },
                                    returning: { type: 'number' },
                                    averageOrderValue: { type: 'number' },
                                },
                            },
                            performance: {
                                type: 'object',
                                properties: {
                                    fulfillmentRate: { type: 'number' },
                                    averageFulfillmentTime: { type: 'number' },
                                    customerSatisfaction: { type: 'number' },
                                    orderAccuracy: { type: 'number' },
                                    responseTime: { type: 'number' },
                                    totalOrders: { type: 'number' },
                                    completedOrders: { type: 'number' },
                                    cancelledOrders: { type: 'number' },
                                    refundRate: { type: 'number' },
                                    averageOrderValue: { type: 'number' },
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
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/performance',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            days: z.number().min(1).max(365).default(30),
            includeDetails: z.boolean().default(false),
        }),
    },
    responses: {
        200: {
            description: 'Vendor performance metrics retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            fulfillmentRate: { type: 'number' },
                            averageFulfillmentTime: { type: 'number' },
                            customerSatisfaction: { type: 'number' },
                            orderAccuracy: { type: 'number' },
                            responseTime: { type: 'number' },
                            totalOrders: { type: 'number' },
                            completedOrders: { type: 'number' },
                            cancelledOrders: { type: 'number' },
                            refundRate: { type: 'number' },
                            averageOrderValue: { type: 'number' },
                            topProducts: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productId: { type: 'string' },
                                        name: { type: 'string' },
                                        salesCount: { type: 'number' },
                                        revenue: { type: 'number' },
                                    },
                                },
                            },
                            performanceTrends: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string' },
                                        orders: { type: 'number' },
                                        revenue: { type: 'number' },
                                        fulfillmentRate: { type: 'number' },
                                    },
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
    },
});
// Vendor Fulfillment Tracking OpenAPI documentation
registry.registerPath({
    method: 'put',
    path: '/vendor/orders/{orderId}/tracking',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({
            orderId: z.string(),
        }),
        body: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            trackingNumber: { type: 'string' },
                            carrier: { type: 'string' },
                            estimatedDelivery: { type: 'string' },
                            currentLocation: { type: 'string' },
                            status: {
                                type: 'string',
                                enum: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
                            },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Fulfillment tracking updated successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            tracking: {
                                type: 'object',
                                properties: {
                                    orderId: { type: 'string' },
                                    trackingNumber: { type: 'string' },
                                    carrier: { type: 'string' },
                                    status: { type: 'string' },
                                    estimatedDelivery: { type: 'string' },
                                    currentLocation: { type: 'string' },
                                    trackingHistory: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string' },
                                                location: { type: 'string' },
                                                timestamp: { type: 'string' },
                                                description: { type: 'string' },
                                            },
                                        },
                                    },
                                    lastUpdated: { type: 'string' },
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
        403: {
            description: 'Access denied',
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
    path: '/vendor/orders/{orderId}/tracking',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({
            orderId: z.string(),
        }),
    },
    responses: {
        200: {
            description: 'Fulfillment tracking retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            orderId: { type: 'string' },
                            trackingNumber: { type: 'string' },
                            carrier: { type: 'string' },
                            status: { type: 'string' },
                            estimatedDelivery: { type: 'string' },
                            currentLocation: { type: 'string' },
                            trackingHistory: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        location: { type: 'string' },
                                        timestamp: { type: 'string' },
                                        description: { type: 'string' },
                                    },
                                },
                            },
                            lastUpdated: { type: 'string' },
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
        403: {
            description: 'Access denied',
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
    method: 'post',
    path: '/vendor/orders/{orderId}/picked-up',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({
            orderId: z.string(),
        }),
        body: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            trackingNumber: { type: 'string' },
                            carrier: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Order marked as picked up successfully',
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
        403: {
            description: 'Access denied',
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
    method: 'post',
    path: '/vendor/orders/{orderId}/out-for-delivery',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({
            orderId: z.string(),
        }),
    },
    responses: {
        200: {
            description: 'Order marked as out for delivery successfully',
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
        403: {
            description: 'Access denied',
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
    method: 'post',
    path: '/vendor/orders/{orderId}/delivered',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({
            orderId: z.string(),
        }),
    },
    responses: {
        200: {
            description: 'Order marked as delivered successfully',
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
        403: {
            description: 'Access denied',
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
// Vendor Payment OpenAPI documentation
registry.registerPath({
    method: 'post',
    path: '/vendor/payment/account',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            vendorId: { type: 'string' },
                            storeId: { type: 'string' },
                            bankCode: { type: 'string' },
                            accountNumber: { type: 'string' },
                            accountName: { type: 'string' },
                            businessName: { type: 'string' },
                            businessEmail: { type: 'string' },
                            businessPhone: { type: 'string' },
                            businessAddress: { type: 'string' },
                        },
                        required: [
                            'vendorId',
                            'storeId',
                            'bankCode',
                            'accountNumber',
                            'accountName',
                            'businessName',
                            'businessEmail',
                        ],
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Vendor Paystack account created successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                            account: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    domain: { type: 'string' },
                                    subaccount_code: { type: 'string' },
                                    business_name: { type: 'string' },
                                    description: { type: 'string' },
                                    primary_contact_name: { type: 'string' },
                                    primary_contact_email: { type: 'string' },
                                    primary_contact_phone: { type: 'string' },
                                    metadata: { type: 'object' },
                                    percentage_charge: { type: 'number' },
                                    settlement_bank: { type: 'string' },
                                    account_number: { type: 'string' },
                                    account_name: { type: 'string' },
                                    settlement_schedule: { type: 'string' },
                                    active: { type: 'boolean' },
                                    currency: { type: 'string' },
                                    type: { type: 'string' },
                                    is_verified: { type: 'boolean' },
                                    verification_fields: { type: 'array' },
                                    created_at: { type: 'string' },
                                    updated_at: { type: 'string' },
                                },
                            },
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
        403: {
            description: 'Forbidden',
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
    path: '/vendor/payment/earnings',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            page: z.number().default(1),
            perPage: z.number().default(20),
        }),
    },
    responses: {
        200: {
            description: 'Vendor earnings retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            totalEarnings: { type: 'number' },
                            totalPayouts: { type: 'number' },
                            pendingPayouts: { type: 'number' },
                            platformFees: { type: 'number' },
                            payouts: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        orderId: { type: 'string' },
                                        amount: { type: 'number' },
                                        platformFee: { type: 'number' },
                                        status: { type: 'string' },
                                        createdAt: { type: 'string' },
                                    },
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
    },
});
registry.registerPath({
    method: 'get',
    path: '/vendor/payment/payouts/history',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            page: z.number().default(1),
            perPage: z.number().default(20),
            status: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: 'Vendor payout history retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            payouts: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        orderId: { type: 'string' },
                                        amount: { type: 'number' },
                                        platformFee: { type: 'number' },
                                        status: { type: 'string' },
                                        createdAt: { type: 'string' },
                                        processedAt: { type: 'string' },
                                        order: {
                                            type: 'object',
                                            properties: {
                                                paymentReference: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                            pagination: {
                                type: 'object',
                                properties: {
                                    page: { type: 'number' },
                                    perPage: { type: 'number' },
                                    total: { type: 'number' },
                                    totalPages: { type: 'number' },
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
    },
});
// Vendor Metrics OpenAPI documentation
registry.registerPath({
    method: 'get',
    path: '/vendor/metrics',
    tags: ['vendor'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            days: z.number().min(1).max(365).default(30).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: 'Vendor metrics retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            period: { type: 'string' },
                            totalOrders: { type: 'number' },
                            totalRevenue: { type: 'number' },
                            byStatus: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        count: { type: 'number' },
                                        revenue: { type: 'number' },
                                    },
                                },
                            },
                            dailySales: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string' },
                                        orders: { type: 'number' },
                                        revenue: { type: 'number' },
                                    },
                                },
                            },
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
// Vendor analytics routes
r.get('/analytics', authGuard, requireVendor, vendorAnalytics.getVendorAnalyticsController);
r.get('/performance', authGuard, requireVendor, vendorAnalytics.getVendorPerformanceController);
// Vendor fulfillment tracking routes
r.put('/orders/:orderId/tracking', authGuard, requireVendor, vendorAnalytics.updateFulfillmentTrackingController);
r.get('/orders/:orderId/tracking', authGuard, requireVendor, vendorAnalytics.getFulfillmentTrackingController);
r.post('/orders/:orderId/picked-up', authGuard, requireVendor, vendorAnalytics.markOrderPickedUpController);
r.post('/orders/:orderId/out-for-delivery', authGuard, requireVendor, vendorAnalytics.markOrderOutForDeliveryController);
r.post('/orders/:orderId/delivered', authGuard, requireVendor, vendorAnalytics.markOrderDeliveredController);
// Vendor payment routes
r.post('/payment/account', authGuard, requireVendor, async (req, res) => {
    try {
        const data = CreateVendorAccountSchema.parse(req.body);
        if (data.vendorId !== req.user.id) {
            return res.status(403).json({ message: 'Cannot create account for another vendor' });
        }
        const result = await createVendorPaystackAccount(data);
        res.json(result);
    }
    catch (err) {
        console.error('Create account error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
r.put('/payment/account/:accountCode', authGuard, requireVendor, async (req, res) => {
    try {
        const accountCode = req.params.accountCode;
        const data = UpdateVendorAccountSchema.parse(req.body);
        const result = await updateVendorPaystackAccount(accountCode, data);
        res.json(result);
    }
    catch (err) {
        console.error('Update account error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
r.get('/payment/account/:accountCode', authGuard, requireVendor, async (req, res) => {
    try {
        const accountCode = req.params.accountCode;
        const account = await getVendorPaystackAccount(accountCode);
        res.json({ account });
    }
    catch (err) {
        console.error('Get account error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
r.get('/payment/earnings', authGuard, requireVendor, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const earnings = await getVendorEarnings(vendorId, start, end);
        res.json(earnings);
    }
    catch (err) {
        console.error('Get earnings error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
r.get('/payment/payouts/history', authGuard, requireVendor, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const history = await getVendorPayoutHistory(vendorId, page, perPage);
        res.json(history);
    }
    catch (err) {
        console.error('Get payout history error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
// Admin-only vendor payment routes
r.get('/payment/accounts', authGuard, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }
        const accounts = await listVendorPaystackAccounts();
        res.json({ accounts });
    }
    catch (err) {
        console.error('List accounts error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
r.get('/payment/settlements/:accountCode', authGuard, requireVendor, async (req, res) => {
    try {
        const accountCode = req.params.accountCode;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const settlements = await getVendorSettlements(accountCode, page, perPage);
        res.json(settlements);
    }
    catch (err) {
        console.error('Get settlements error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
r.post('/payment/payouts/process/:orderId', authGuard, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }
        const orderId = req.params.orderId;
        const result = await processVendorPayouts(orderId);
        res.json(result);
    }
    catch (err) {
        console.error('Process payouts error:', err);
        res.status(400).json({ message: err.message || 'Internal server error' });
    }
});
// Vendor metrics route
r.get('/metrics', authGuard, requireVendor, vendorAnalytics.getVendorMetricsController);
export default r;
