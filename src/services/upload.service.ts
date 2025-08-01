/* eslint-disable @typescript-eslint/no-explicit-any */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import {
  autoOptimizeImage,
  generateOptimizedFilename,
  ImageProcessingOptions,
  ImageProcessingOptionsType,
} from './image-processing.service';

// Environment variables
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minio';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minio123';
const S3_BUCKET = process.env.S3_BUCKET || 'marketplace-images';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const CDN_BASE_URL = process.env.CDN_BASE_URL || S3_ENDPOINT;

// For presigned URLs, we need to use the external endpoint that the frontend can access
const PRESIGNED_URL_ENDPOINT = process.env.PRESIGNED_URL_ENDPOINT || 'http://localhost:9000';

// S3 client configuration for backend operations
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

// S3 client configuration for generating presigned URLs (uses external endpoint)
const presignedUrlClient = new S3Client({
  endpoint: PRESIGNED_URL_ENDPOINT,
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
  files: z.array(
    z.object({
      fileName: z.string().min(1),
      contentType: z.string().regex(/^image\//),
      fileSize: z.number().max(10 * 1024 * 1024),
      processingOptions: ImageProcessingOptions.optional(),
    }),
  ),
  generateThumbnails: z.boolean().optional(),
});

export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;
export type BulkUploadRequest = z.infer<typeof BulkUploadRequestSchema>;

// Enhanced upload result
export interface EnhancedUploadResult {
  uploadUrl: string;
  fileUrl: string;
  fileName: string;
  thumbnailUrl?: string;
  thumbnailFileName?: string;
  optimizedFormat: string;
  originalFormat: string;
  width: number;
  height: number;
  size: number;
  thumbnailSize?: number;
}

/**
 * Generate a presigned URL for uploading an image
 */
export async function generateUploadUrl(request: UploadRequest): Promise<{
  uploadUrl: string;
  fileUrl: string;
  fileName: string;
}> {
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

  const uploadUrl = await getSignedUrl(presignedUrlClient, command, { expiresIn: 3600 }); // 1 hour

  // Generate public URL via CDN
  const fileUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;

  return {
    uploadUrl,
    fileUrl,
    fileName,
  };
}

/**
 * Enhanced upload with image processing and optimization
 */
export async function generateEnhancedUploadUrl(
  request: UploadRequest,
  _userAgent?: string,
): Promise<EnhancedUploadResult> {
  // Validate request
  const validatedRequest = UploadRequestSchema.parse(request);

  // Generate optimized filename
  const optimizedFormat = validatedRequest.processingOptions?.format || 'webp';
  const fileName = generateOptimizedFilename(validatedRequest.fileName, optimizedFormat);

  // Create presigned URL for optimized image
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileName,
    ContentType: `image/${optimizedFormat}`,
  });

  const uploadUrl = await getSignedUrl(presignedUrlClient, command, { expiresIn: 3600 });

  // Generate public URL
  const fileUrl = `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;

  // Generate thumbnail URL if requested
  let thumbnailUrl: string | undefined;
  let thumbnailFileName: string | undefined;

  if (validatedRequest.generateThumbnail) {
    thumbnailFileName = generateOptimizedFilename(
      validatedRequest.fileName,
      optimizedFormat,
      'thumb',
    );
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
}

/**
 * Process and upload image with optimization
 */
export async function processAndUploadImage(
  buffer: Buffer,
  originalName: string,
  userAgent?: string,
  _processingOptions?: ImageProcessingOptionsType,
): Promise<EnhancedUploadResult> {
  // Process image with optimization
  const { optimized, thumbnail, originalFormat, optimizedFormat } = await autoOptimizeImage(
    buffer,
    originalName,
    userAgent,
  );

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

  await s3Client.send(command);

  // Upload thumbnail if generated
  if (thumbnail && thumbnailFileName) {
    const thumbnailCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: thumbnailFileName,
      Body: thumbnail.buffer,
      ContentType: `image/${optimizedFormat}`,
    });

    await s3Client.send(thumbnailCommand);
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
    thumbnailSize: thumbnail?.size,
  };
}

/**
 * Bulk upload multiple images
 */
export async function bulkUploadImages(
  files: Array<{ buffer: Buffer; originalName: string }>,
  userAgent?: string,
  processingOptions?: ImageProcessingOptionsType,
): Promise<EnhancedUploadResult[]> {
  const results: EnhancedUploadResult[] = [];

  for (const file of files) {
    try {
      const result = await processAndUploadImage(
        file.buffer,
        file.originalName,
        userAgent,
        processingOptions,
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.originalName}:`, error);
      // Continue with other files
    }
  }

  return results;
}

/**
 * Delete an image from storage
 */
export async function deleteImage(request: DeleteRequest): Promise<void> {
  const validatedRequest = DeleteRequestSchema.parse(request);

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: validatedRequest.fileName,
  });

  await s3Client.send(command);
}

/**
 * Initialize the S3 bucket if it doesn't exist
 */
export async function initializeBucket(): Promise<void> {
  try {
    // Check if bucket exists by trying to list objects
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      MaxKeys: 1,
    });

    try {
      await s3Client.send(listCommand);
      console.log(`✅ Bucket ${S3_BUCKET} exists and is accessible`);
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        console.log(`📦 Creating bucket ${S3_BUCKET}...`);
        const { CreateBucketCommand } = await import('@aws-sdk/client-s3');
        const createCommand = new CreateBucketCommand({
          Bucket: S3_BUCKET,
        });
        await s3Client.send(createCommand);
        console.log(`✅ Bucket ${S3_BUCKET} created successfully`);
      } else {
        throw error;
      }
    }

    console.log(`✅ Using S3-compatible storage at ${S3_ENDPOINT}`);
    console.log(`📦 Bucket: ${S3_BUCKET}`);
  } catch (error) {
    console.error('❌ Failed to initialize S3 bucket:', error);
    throw error;
  }
}

/**
 * Get the public URL for an image
 */
export function getImageUrl(fileName: string): string {
  return `${CDN_BASE_URL}/${S3_BUCKET}/${fileName}`;
}
