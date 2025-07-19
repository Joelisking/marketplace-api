import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { registry } from '../lib/openapi';
import * as schema from '../schema';

// OpenAPI registration for auth endpoints
registry.registerPath({
  method: 'post',
  path: '/auth/register',
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

const r = Router();
r.post('/register', ctrl.register);
r.post('/login', ctrl.login);
r.post('/refresh', ctrl.refresh);
r.get('/users', ctrl.getAllUsers);

export default r;
