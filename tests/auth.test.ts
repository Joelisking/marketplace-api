// Jest test file
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';

describe('Auth Endpoints', () => {
  let testUser: { id: string; email: string; token: string; role: string };

  beforeAll(async () => {
    testUser = await createTestUser('customer@test.com', 'CUSTOMER');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app).post('/auth/register').send({
        email: 'newuser@test.com',
        password: 'password123',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.role).toBe('CUSTOMER');

      // Clean up
      await prisma.user.delete({ where: { email: 'newuser@test.com' } });
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app).post('/auth/login').send({
        email: testUser.email,
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('storeId');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.role).toBe(testUser.role);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Missing token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });
  });
});
