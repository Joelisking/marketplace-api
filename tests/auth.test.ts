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
    it('should register a new user with basic info', async () => {
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
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('lastName');
      expect(response.body.user).toHaveProperty('phone');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');

      // Clean up
      await prisma.user.delete({ where: { email: 'newuser@test.com' } });
    });

    it('should register a new user with full metadata', async () => {
      const response = await request(app).post('/auth/register').send({
        email: 'fulluser@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+233123456789',
      });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('fulluser@test.com');
      expect(response.body.user.firstName).toBe('John');
      expect(response.body.user.lastName).toBe('Doe');
      expect(response.body.user.phone).toBe('+233123456789');

      // Clean up
      await prisma.user.delete({ where: { email: 'fulluser@test.com' } });
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
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('lastName');
      expect(response.body.user).toHaveProperty('phone');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).toHaveProperty('storeId');
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('lastName');
      expect(response.body.user).toHaveProperty('phone');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe(testUser.role);
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

  describe('PATCH /auth/me', () => {
    it('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+233987654321',
      };

      const response = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('firstName', 'Updated');
      expect(response.body.user).toHaveProperty('lastName', 'Name');
      expect(response.body.user).toHaveProperty('phone', '+233987654321');
      expect(response.body.user).toHaveProperty('updatedAt');
    });

    it('should update partial user profile data', async () => {
      const updateData = {
        firstName: 'Partial',
      };

      const response = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('firstName', 'Partial');
      expect(response.body.user).toHaveProperty('updatedAt');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).patch('/auth/me').send({ firstName: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Missing token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .patch('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .send({ firstName: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });
  });
});
