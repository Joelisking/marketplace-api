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
import { autoOptimizeImage, generateOptimizedFilename, ImageProcessingOptions, } from './image-processing.service';
// Environment variables
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minio';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minio123';
const S3_BUCKET = process.env.S3_BUCKET || 'marketplace-images';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const CDN_BASE_URL = process.env.CDN_BASE_URL || S3_ENDPOINT;
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
    processingOptions: ImageProcessingOptions.optional(),
    generateThumbnail: z.boolean().optional(),
});
export const DeleteRequestSchema = z.object({
    fileName: z.string().min(1),
});
export const BulkUploadRequestSchema = z.object({
    files: z.array(z.object({
        fileName: z.string().min(1),
        contentType: z.string().regex(/^image\//),
        fileSize: z.number().max(10 * 1024 * 1024),
        processingOptions: ImageProcessingOptions.optional(),
    })),
    generateThumbnails: z.boolean().optional(),
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
        // Generate public URL via CDN
        const fileUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;
        return {
            uploadUrl,
            fileUrl,
            fileName,
        };
    });
}
/**
 * Enhanced upload with image processing and optimization
 */
export function generateEnhancedUploadUrl(request, _userAgent) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Validate request
        const validatedRequest = UploadRequestSchema.parse(request);
        // Generate optimized filename
        const optimizedFormat = ((_a = validatedRequest.processingOptions) === null || _a === void 0 ? void 0 : _a.format) || 'webp';
        const fileName = generateOptimizedFilename(validatedRequest.fileName, optimizedFormat);
        // Create presigned URL for optimized image
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            ContentType: `image/${optimizedFormat}`,
        });
        const uploadUrl = yield getSignedUrl(s3Client, command, { expiresIn: 3600 });
        // Generate public URL
        const fileUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;
        // Generate thumbnail URL if requested
        let thumbnailUrl;
        let thumbnailFileName;
        if (validatedRequest.generateThumbnail) {
            thumbnailFileName = generateOptimizedFilename(validatedRequest.fileName, optimizedFormat, 'thumb');
            thumbnailUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${thumbnailFileName}`;
        }
        return {
            uploadUrl,
            fileUrl,
            fileName,
            thumbnailUrl,
            thumbnailFileName,
            optimizedFormat,
            originalFormat: validatedRequest.fileName.split('.').pop() || 'jpeg',
            width: 0, // Will be set after processing
            height: 0, // Will be set after processing
            size: 0, // Will be set after processing
        };
    });
}
/**
 * Process and upload image with optimization
 */
export function processAndUploadImage(buffer, originalName, userAgent, _processingOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        // Process image with optimization
        const { optimized, thumbnail, originalFormat, optimizedFormat } = yield autoOptimizeImage(buffer, originalName, userAgent);
        // Generate filenames
        const fileName = generateOptimizedFilename(originalName, optimizedFormat);
        const thumbnailFileName = thumbnail
            ? generateOptimizedFilename(originalName, optimizedFormat, 'thumb')
            : undefined;
        // Upload optimized image
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: optimized.buffer,
            ContentType: `image/${optimizedFormat}`,
        });
        yield s3Client.send(command);
        // Upload thumbnail if generated
        if (thumbnail && thumbnailFileName) {
            const thumbnailCommand = new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: thumbnailFileName,
                Body: thumbnail.buffer,
                ContentType: `image/${optimizedFormat}`,
            });
            yield s3Client.send(thumbnailCommand);
        }
        // Generate URLs
        const fileUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;
        const thumbnailUrl = thumbnailFileName
            ? `${CDN_BASE_URL}/${S3_BUCKET}/${thumbnailFileName}`
            : undefined;
        return {
            uploadUrl: '', // Not needed for direct upload
            fileUrl,
            fileName,
            thumbnailUrl,
            thumbnailFileName,
            optimizedFormat,
            originalFormat,
            width: optimized.width,
            height: optimized.height,
            size: optimized.size,
            thumbnailSize: thumbnail === null || thumbnail === void 0 ? void 0 : thumbnail.size,
        };
    });
}
/**
 * Bulk upload multiple images
 */
export function bulkUploadImages(files, userAgent, processingOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        for (const file of files) {
            try {
                const result = yield processAndUploadImage(file.buffer, file.originalName, userAgent, processingOptions);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to upload ${file.originalName}:`, error);
                // Continue with other files
            }
        }
        return results;
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
    return `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;
}
