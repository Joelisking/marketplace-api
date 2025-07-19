import { Router } from 'express';
import * as prod from '../controllers/product.controller';
import * as store from '../controllers/store.controller';
import { registry } from '../lib/openapi';
import * as schema from '../schema';
import { authGuard, requireVendor, requireProductOwnership } from '../middlewares/auth';
// OpenAPI registration for catalogue endpoints
registry.registerPath({
    method: 'get',
    path: '/products',
    tags: ['catalogue'],
    request: {
        query: schema.ProductSearchQuery,
    },
    responses: {
        200: {
            description: 'List of products',
            content: {
                'application/json': {
                    schema: schema.ProductListResponse,
                },
            },
        },
    },
});
registry.registerPath({
    method: 'post',
    path: '/products',
    tags: ['catalogue'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.ProductCreate,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Product created successfully',
            content: {
                'application/json': {
                    schema: schema.ProductResponse,
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
            description: 'Vendor role required - you must own a store to create products',
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
    path: '/products/{id}',
    tags: ['catalogue'],
    request: {
        params: schema.ProductIdParam,
    },
    responses: {
        200: {
            description: 'Product details',
            content: {
                'application/json': {
                    schema: schema.ProductResponse,
                },
            },
        },
        404: {
            description: 'Product not found',
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
    method: 'put',
    path: '/products/{id}',
    tags: ['catalogue'],
    request: {
        params: schema.ProductIdParam,
        body: {
            content: {
                'application/json': {
                    schema: schema.ProductUpdate,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Product updated successfully',
            content: {
                'application/json': {
                    schema: schema.ProductResponse,
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
            description: 'Access denied - you do not own this product',
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
            description: 'Product not found or access denied',
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
    method: 'delete',
    path: '/products/{id}',
    tags: ['catalogue'],
    request: {
        params: schema.ProductIdParam,
    },
    responses: {
        204: {
            description: 'Product deleted successfully',
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
            description: 'Access denied - you do not own this product',
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
            description: 'Product not found or access denied',
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
    path: '/stores',
    tags: ['catalogue'],
    request: {
        query: schema.StoreSearchQuery,
    },
    responses: {
        200: {
            description: 'List of stores',
            content: {
                'application/json': {
                    schema: schema.StoreListResponse,
                },
            },
        },
    },
});
registry.registerPath({
    method: 'post',
    path: '/stores',
    tags: ['catalogue'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.StoreCreate,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Store created successfully',
            content: {
                'application/json': {
                    schema: schema.StoreResponse,
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
        409: {
            description: 'You already own a store or store slug already exists',
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
    path: '/stores/{slug}',
    tags: ['catalogue'],
    request: {
        params: schema.StoreSlugParam,
    },
    responses: {
        200: {
            description: 'Store details',
            content: {
                'application/json': {
                    schema: schema.StoreResponse,
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
    method: 'put',
    path: '/stores/{slug}',
    tags: ['catalogue'],
    request: {
        params: schema.StoreSlugParam,
        body: {
            content: {
                'application/json': {
                    schema: schema.StoreUpdate,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Store updated successfully',
            content: {
                'application/json': {
                    schema: schema.StoreResponse,
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
            description: 'Access denied - you do not own this store',
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
            description: 'Store not found or access denied',
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
    method: 'delete',
    path: '/stores/{slug}',
    tags: ['catalogue'],
    request: {
        params: schema.StoreSlugParam,
    },
    responses: {
        204: {
            description: 'Store deleted successfully',
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
            description: 'Access denied - you do not own this store',
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
            description: 'Store not found or access denied',
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
    path: '/stores/{slug}/products',
    tags: ['catalogue'],
    request: {
        params: schema.StoreSlugParam,
        query: schema.ProductSearchQuery,
    },
    responses: {
        200: {
            description: 'Products from a specific store',
            content: {
                'application/json': {
                    schema: schema.ProductListResponse,
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
// Product routes
r.get('/products', prod.getProducts);
r.post('/products', authGuard, requireVendor, prod.createProduct);
r.get('/products/:id', prod.getProductById);
r.put('/products/:id', authGuard, requireProductOwnership, prod.updateProduct);
r.delete('/products/:id', authGuard, requireProductOwnership, prod.deleteProduct);
// Store routes
r.get('/stores', store.getStores);
r.post('/stores', authGuard, store.createStore);
r.get('/stores/:slug', store.getStore);
r.put('/stores/:slug', authGuard, store.updateStore);
r.delete('/stores/:slug', authGuard, store.deleteStore);
r.get('/stores/:slug/products', store.getStoreProducts);
export default r;
