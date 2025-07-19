import sharp from 'sharp';
import { z } from 'zod';

// Image processing configuration
export const ImageProcessingConfig = {
  // Maximum dimensions
  maxWidth: 2048,
  maxHeight: 2048,

  // Thumbnail dimensions
  thumbnailWidth: 300,
  thumbnailHeight: 300,

  // Quality settings
  jpegQuality: 85,
  webpQuality: 80,
  avifQuality: 75,

  // Supported formats
  supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'],

  // Maximum file size (10MB)
  maxFileSize: 10 * 1024 * 1024,
};

// Image processing options schema
export const ImageProcessingOptions = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  quality: z.number().min(1).max(100).optional(),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  position: z
    .enum([
      'top',
      'right top',
      'right',
      'right bottom',
      'bottom',
      'left bottom',
      'left',
      'left top',
      'center',
    ])
    .optional(),
  background: z.string().optional(),
  stripMetadata: z.boolean().optional(),
  generateThumbnail: z.boolean().optional(),
});

export type ImageProcessingOptionsType = z.infer<typeof ImageProcessingOptions>;

// Processed image result
export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  metadata: sharp.Metadata;
}

// Thumbnail result
export interface ThumbnailResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Validate image file
 */
export async function validateImage(
  buffer: Buffer,
  _originalName: string,
): Promise<{
  isValid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}> {
  try {
    // Check file size
    if (buffer.length > ImageProcessingConfig.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${ImageProcessingConfig.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Check if it's a valid image
    if (!metadata.format || !ImageProcessingConfig.supportedFormats.includes(metadata.format)) {
      return {
        isValid: false,
        error: `Unsupported image format. Supported formats: ${ImageProcessingConfig.supportedFormats.join(', ')}`,
      };
    }

    // Check dimensions
    if (metadata.width && metadata.width > ImageProcessingConfig.maxWidth) {
      return {
        isValid: false,
        error: `Image width (${metadata.width}px) exceeds maximum allowed width of ${ImageProcessingConfig.maxWidth}px`,
      };
    }

    if (metadata.height && metadata.height > ImageProcessingConfig.maxHeight) {
      return {
        isValid: false,
        error: `Image height (${metadata.height}px) exceeds maximum allowed height of ${ImageProcessingConfig.maxHeight}px`,
      };
    }

    return {
      isValid: true,
      metadata,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid image file',
    };
  }
}

/**
 * Process and optimize image
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptionsType = {},
): Promise<ProcessedImage> {
  const {
    width,
    height,
    quality = ImageProcessingConfig.jpegQuality,
    format,
    fit = 'cover',
    position = 'center',
    background = '#FFFFFF',
    stripMetadata = true,
  } = options;

  let sharpInstance = sharp(buffer);

  // Strip metadata if requested
  if (stripMetadata) {
    sharpInstance = sharpInstance.withMetadata();
  }

  // Resize if dimensions provided
  if (width || height) {
    sharpInstance = sharpInstance.resize(width, height, {
      fit,
      position,
      background,
    });
  }

  // Convert format and set quality
  if (format) {
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality });
        break;
    }
  }

  // Process the image
  const processedBuffer = await sharpInstance.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    format: format || metadata.format || 'jpeg',
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: processedBuffer.length,
    metadata,
  };
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
  buffer: Buffer,
  options: ImageProcessingOptionsType = {},
): Promise<ThumbnailResult> {
  const {
    quality = ImageProcessingConfig.jpegQuality,
    format = 'jpeg',
    fit = 'cover',
    position = 'center',
    background = '#FFFFFF',
    stripMetadata = true,
  } = options;

  let sharpInstance = sharp(buffer);

  // Strip metadata if requested
  if (stripMetadata) {
    sharpInstance = sharpInstance.withMetadata();
  }

  // Resize to thumbnail dimensions
  sharpInstance = sharpInstance.resize(
    ImageProcessingConfig.thumbnailWidth,
    ImageProcessingConfig.thumbnailHeight,
    {
      fit,
      position,
      background,
    },
  );

  // Convert format and set quality
  switch (format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ quality });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality });
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({ quality });
      break;
  }

  // Process the thumbnail
  const thumbnailBuffer = await sharpInstance.toBuffer();
  const metadata = await sharp(thumbnailBuffer).metadata();

  return {
    buffer: thumbnailBuffer,
    format,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: thumbnailBuffer.length,
  };
}

/**
 * Detect best format for browser support
 */
export function detectBestFormat(userAgent?: string): 'jpeg' | 'webp' | 'avif' {
  if (!userAgent) return 'jpeg';

  // Check for AVIF support
  if (userAgent.includes('Chrome/85') || userAgent.includes('Firefox/93')) {
    return 'avif';
  }

  // Check for WebP support
  if (
    userAgent.includes('Chrome') ||
    userAgent.includes('Firefox') ||
    userAgent.includes('Safari')
  ) {
    return 'webp';
  }

  // Fallback to JPEG
  return 'jpeg';
}

/**
 * Get image format from filename
 */
export function getFormatFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'gif':
      return 'gif';
    default:
      return 'jpeg';
  }
}

/**
 * Generate optimized filename
 */
export function generateOptimizedFilename(
  _originalName: string,
  format: string,
  suffix?: string,
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const formatSuffix = suffix ? `-${suffix}` : '';

  return `uploads/${timestamp}-${randomSuffix}${formatSuffix}.${format}`;
}

/**
 * Process image with automatic optimization
 */
export async function autoOptimizeImage(
  buffer: Buffer,
  originalName: string,
  userAgent?: string,
): Promise<{
  optimized: ProcessedImage;
  thumbnail?: ThumbnailResult;
  originalFormat: string;
  optimizedFormat: string;
}> {
  // Validate image first
  const validation = await validateImage(buffer, originalName);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const originalFormat = getFormatFromFilename(originalName);
  const bestFormat = detectBestFormat(userAgent);

  // Process main image
  const optimized = await processImage(buffer, {
    format: bestFormat,
    quality:
      bestFormat === 'avif'
        ? ImageProcessingConfig.avifQuality
        : bestFormat === 'webp'
          ? ImageProcessingConfig.webpQuality
          : ImageProcessingConfig.jpegQuality,
    stripMetadata: true,
  });

  // Generate thumbnail
  const thumbnail = await generateThumbnail(buffer, {
    format: bestFormat,
    quality:
      bestFormat === 'avif'
        ? ImageProcessingConfig.avifQuality
        : bestFormat === 'webp'
          ? ImageProcessingConfig.webpQuality
          : ImageProcessingConfig.jpegQuality,
    stripMetadata: true,
  });

  return {
    optimized,
    thumbnail,
    originalFormat,
    optimizedFormat: bestFormat,
  };
}
