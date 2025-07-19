var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Jest test file
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';
describe('Auth Endpoints', () => {
    let testUser;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        testUser = yield createTestUser('customer@test.com', 'CUSTOMER');
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield prisma.user.deleteMany({ where: { email: testUser.email } });
    }));
    describe('POST /auth/register', () => {
        it('should register a new user', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).post('/auth/register').send({
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
            yield prisma.user.delete({ where: { email: 'newuser@test.com' } });
        }));
    });
    describe('POST /auth/login', () => {
        it('should login with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).post('/auth/login').send({
                email: testUser.email,
                password: 'password123',
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(testUser.email);
        }));
    });
    describe('GET /auth/me', () => {
        it('should get current user profile with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${testUser.token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('email');
            expect(response.body).toHaveProperty('role');
            expect(response.body).toHaveProperty('storeId');
            expect(response.body.email).toBe(testUser.email);
            expect(response.body.role).toBe(testUser.role);
        }));
        it('should fail without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).get('/auth/me');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Missing token');
        }));
        it('should fail with invalid token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid token');
        }));
    });
});
