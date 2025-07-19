import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { registry } from '../lib/openapi';
import * as schema from '../schema';
import { authGuard } from '../middlewares/auth';
// OpenAPI registration for auth endpoints
registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['auth'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.RegisterBody,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'User registered successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
        409: {
            description: 'Email already in use',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['auth'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.LoginBody,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'User logged in successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: ['auth'],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.RefreshBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Token refreshed successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
registry.registerPath({
    method: 'get',
    path: '/auth/users',
    tags: ['auth'],
    responses: {
        200: {
            description: 'List of all users',
            content: {
                'application/json': {
                    schema: {
                        type: 'array',
                        items: {
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
});
registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['auth'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Current user profile retrieved successfully',
            content: {
                'application/json': {
                    schema: schema.MeResponse,
                },
            },
        },
        401: {
            description: 'Authentication required',
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
            description: 'User not found',
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
r.post('/register', ctrl.register);
r.post('/login', ctrl.login);
r.post('/refresh', ctrl.refresh);
r.get('/users', ctrl.getAllUsers);
r.get('/me', authGuard, ctrl.me);
export default r;
