import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';

describe('Admin Vendor Applications Endpoints', () => {
  let adminToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Create test admin user
    const adminEmail = 'admin@test.com';
    await request(app).post('/auth/register').send({
      email: adminEmail,
      password: 'testpassword123',
    });

    // Update user to admin role
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });

    // Login to get admin token
    const adminResponse = await request(app).post('/auth/login').send({
      email: adminEmail,
      password: 'testpassword123',
    });
    adminToken = adminResponse.body.accessToken;

    // Create test user
    testUser = await createTestUser('vendor@test.com');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'vendor@test.com'],
        },
      },
    });
  });

  describe('GET /vendor-onboarding/admin/applications', () => {
    beforeEach(async () => {
      // Create test vendor application
      await prisma.vendorApplication.create({
        data: {
          userId: testUser.id,
          businessName: 'Test Business',
          businessType: 'SOLE_PROPRIETORSHIP',
          businessDescription: 'A test business',
          businessAddress: '123 Test St, Accra',
          businessPhone: '+233201234567',
          ghanaCardNumber: 'GHA-123456789-1',
          bankName: 'Test Bank',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Test Account',
          bankCode: 'TEST',
          expectedMonthlySales: 'TEN_TO_FIFTY_THOUSAND',
          status: 'PENDING',
        },
      });
    });

    afterEach(async () => {
      await prisma.vendorApplication.deleteMany({
        where: {
          userId: testUser.id,
        },
      });
    });

    it('should get all applications with default pagination', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(1);
      expect(response.body.applications[0].status).toBe('PENDING');
    });

    it('should filter by business type', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications?businessType=SOLE_PROPRIETORSHIP')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(1);
      expect(response.body.applications[0].businessType).toBe('SOLE_PROPRIETORSHIP');
    });

    it('should search by business name', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications?search=Test Business')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(1);
      expect(response.body.applications[0].businessName).toBe('Test Business');
    });

    it('should search by user email', async () => {
      const response = await request(app)
        .get(`/vendor-onboarding/admin/applications?search=${testUser.email}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(1);
      expect(response.body.applications[0].user.email).toBe(testUser.email);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should return empty results for non-matching filters', async () => {
      const response = await request(app)
        .get('/vendor-onboarding/admin/applications?status=APPROVED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(0);
    });

    it('should require admin authentication', async () => {
      await request(app).get('/vendor-onboarding/admin/applications').expect(401);
    });
  });
});
