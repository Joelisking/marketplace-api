import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createTestUser } from './utils/test-helpers';
describe('Upload Endpoints', () => {
    let vendorUser;
    let customerUser;
    beforeAll(async () => {
        vendorUser = await createTestUser('vendor@upload.test.com', 'VENDOR');
        customerUser = await createTestUser('customer@upload.test.com', 'CUSTOMER');
    });
    afterAll(async () => {
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [vendorUser.email, customerUser.email],
                },
            },
        });
    });
    describe('POST /upload/presigned-url', () => {
        it('should generate presigned URL for vendor', async () => {
            const response = await request(app)
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
        });
        it('should fail without authentication', async () => {
            const response = await request(app)
                .post('/upload/presigned-url')
                .send({
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024 * 1024,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
        });
        it('should fail for non-vendor users', async () => {
            const response = await request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${customerUser.token}`)
                .send({
                fileName: 'test-image.jpg',
                contentType: 'image/jpeg',
                fileSize: 1024 * 1024,
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message');
        });
        it('should fail with invalid file type', async () => {
            const response = await request(app)
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
        });
        it('should fail with file too large', async () => {
            const response = await request(app)
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
        });
        it('should fail with missing required fields', async () => {
            const response = await request(app)
                .post('/upload/presigned-url')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'test-image.jpg',
                // Missing contentType and fileSize
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid upload request');
        });
    });
    describe('DELETE /upload/delete', () => {
        it('should delete image for vendor', async () => {
            const response = await request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Image deleted successfully');
        });
        it('should fail without authentication', async () => {
            const response = await request(app).delete('/upload/delete').send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message');
        });
        it('should fail for non-vendor users', async () => {
            const response = await request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${customerUser.token}`)
                .send({
                fileName: 'uploads/test-file.jpg',
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message');
        });
        it('should fail with missing fileName', async () => {
            const response = await request(app)
                .delete('/upload/delete')
                .set('Authorization', `Bearer ${vendorUser.token}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Invalid delete request');
        });
    });
});
