var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
// Environment variables
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minio';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minio123';
const S3_BUCKET = process.env.S3_BUCKET || 'marketplace-images';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
// S3 client configuration
const s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
});
// Validation schemas
export const UploadRequestSchema = z.object({
    fileName: z.string().min(1),
    contentType: z.string().regex(/^image\//),
    fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
});
export const DeleteRequestSchema = z.object({
    fileName: z.string().min(1),
});
/**
 * Generate a presigned URL for uploading an image
 */
export function generateUploadUrl(request) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate request
        const validatedRequest = UploadRequestSchema.parse(request);
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const extension = validatedRequest.fileName.split('.').pop() || 'jpg';
        const fileName = `uploads/${timestamp}-${randomSuffix}.${extension}`;
        // Create presigned URL
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            ContentType: validatedRequest.contentType,
        });
        const uploadUrl = yield getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        // Generate public URL
        const fileUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${fileName}`;
        return {
            uploadUrl,
            fileUrl,
            fileName,
        };
    });
}
/**
 * Delete an image from storage
 */
export function deleteImage(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const validatedRequest = DeleteRequestSchema.parse(request);
        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: validatedRequest.fileName,
        });
        yield s3Client.send(command);
    });
}
/**
 * Initialize the S3 bucket if it doesn't exist
 */
export function initializeBucket() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // For MinIO, we'll assume the bucket exists or create it manually
            // In production with AWS S3, you'd want to create the bucket programmatically
            console.log(`✅ Using S3-compatible storage at ${S3_ENDPOINT}`);
            console.log(`📦 Bucket: ${S3_BUCKET}`);
        }
        catch (error) {
            console.error('❌ Failed to initialize S3 bucket:', error);
            throw error;
        }
    });
}
/**
 * Get the public URL for an image
 */
export function getImageUrl(fileName) {
    return `${S3_ENDPOINT}/${S3_BUCKET}/${fileName}`;
}
