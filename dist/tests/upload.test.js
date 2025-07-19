var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';
describe('Upload Endpoints', () => {
    let vendorUser;
    let customerUser;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        vendorUser = yield createTestUser('vendor@upload.test.com', 'VENDOR');
        customerUser = yield createTestUser('customer@upload.test.com', 'CUSTOMER');
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield prisma.user.deleteMany({
            where: {
                email: {
                    in: [vendorUser.email, customerUser.email],
                },
            },
        });
    }));
    describe('POST /upload/presigned-url', () => {
        it('should generate presigned URL for vendor', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024 * 1024, // 1MB
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uploadUrl');
            expect(response.body).toHaveProperty('fileUrl');
            expect(response.body).toHaveProperty('fileName');
            expect(response.body).toHaveProperty('expiresIn');
            expect(response.body.expiresIn).toBe(3600);
            expect(response.body.uploadUrl).toContain('http');
            expect(response.body.fileUrl).toContain('http');
        }));
        it('should fail without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .send({
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024 * 1024,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
        }));
        it('should fail for non-vendor users', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${customerUser.token}`)
                .send({
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024 * 1024,
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message');
        }));
        it('should fail with invalid file type', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'test.txt',
                contentType: 'text/plain',
                fileSize: 1024,
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid upload request');
        }));
        it('should fail with file too large', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'large-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 20 * 1024 * 1024, // 20MB (over 10MB limit)
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid upload request');
        }));
        it('should fail with missing required fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'test-image.jpg',
                // Missing contentType and fileSize
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid upload request');
        }));
    });
    describe('DELETE /upload/delete', () => {
        it('should delete image for vendor', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Image deleted successfully');
        }));
        it('should fail without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app).delete('/upload/delete').send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
        }));
        it('should fail for non-vendor users', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${customerUser.token}`)
                .send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message');
        }));
        it('should fail with missing fileName', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid delete request');
        }));
    });
});
