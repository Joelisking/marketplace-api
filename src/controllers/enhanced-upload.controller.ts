import { Request, Response } from 'express';
import multer from 'multer';
import {
  generateEnhancedUploadUrl,
  processAndUploadImage,
  bulkUploadImages as bulkUploadService,
  UploadRequestSchema,
} from '../services/upload.service';
import { detectBestFormat } from '../services/image-processing.service';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Enhanced upload URL generation with image processing options
 */
export async function getEnhancedUploadUrl(req: Request, res: Response) {
  try {
    const body = UploadRequestSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];

    const result = await generateEnhancedUploadUrl(body, userAgent);

    res.json({
      ...result,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Invalid upload request',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Direct image upload with processing and optimization
 */
export async function uploadAndProcessImage(req: Request, res: Response) {
  try {
    // Use multer to handle file upload
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: 'No image file provided',
        });
      }

      const userAgent = req.headers['user-agent'];
      const processingOptions = req.body.processingOptions
        ? JSON.parse(req.body.processingOptions)
        : undefined;

      const result = await processAndUploadImage(
        req.file.buffer,
        req.file.originalname,
        userAgent,
        processingOptions,
      );

      res.json({
        message: 'Image uploaded and processed successfully',
        ...result,
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Image processing error',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Bulk upload multiple images
 */
export async function bulkUploadImages(req: Request, res: Response) {
  try {
    // Use multer to handle multiple file uploads
    upload.array('images', 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message,
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: 'No image files provided',
        });
      }

      const userAgent = req.headers['user-agent'];
      const processingOptions = req.body.processingOptions
        ? JSON.parse(req.body.processingOptions)
        : undefined;

      const files = (req.files as any[]).map((file) => ({
        buffer: file.buffer,
        originalName: file.originalname,
      }));

      const results = await bulkUploadService(files, userAgent, processingOptions);

      res.json({
        message: `${results.length} images uploaded and processed successfully`,
        results,
        summary: {
          total: files.length,
          successful: results.length,
          failed: files.length - results.length,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Bulk upload error',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Get image processing capabilities
 */
export async function getImageCapabilities(req: Request, res: Response) {
  const userAgent = req.headers['user-agent'];
  const bestFormat = detectBestFormat(userAgent);

  res.json({
    supportedFormats: ['jpeg', 'png', 'webp', 'avif'],
    recommendedFormat: bestFormat,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxDimensions: {
      width: 2048,
      height: 2048,
    },
    thumbnailDimensions: {
      width: 300,
      height: 300,
    },
    qualitySettings: {
      jpeg: 85,
      webp: 80,
      avif: 75,
    },
    features: {
      imageResizing: true,
      formatConversion: true,
      qualityOptimization: true,
      thumbnailGeneration: true,
      metadataStripping: true,
      bulkUpload: true,
      cdnIntegration: true,
    },
  });
}

/**
 * Generate responsive image URLs
 */
export async function generateResponsiveUrls(req: Request, res: Response) {
  try {
    const { imageUrl, sizes } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        message: 'Image URL is required',
      });
    }

    // Generate responsive URLs for different screen sizes
    const responsiveUrls = {
      original: imageUrl,
      thumbnail: imageUrl.replace(/\.(\w+)$/, '-thumb.$1'),
      small: imageUrl.replace(/\.(\w+)$/, '-small.$1'),
      medium: imageUrl.replace(/\.(\w+)$/, '-medium.$1'),
      large: imageUrl.replace(/\.(\w+)$/, '-large.$1'),
    };

    res.json({
      responsiveUrls,
      sizes: sizes || ['thumbnail', 'small', 'medium', 'large'],
    });
  } catch {
    res.status(500).json({
      message: 'Error generating responsive URLs',
    });
  }
}

// Export multer for use in routes
export { upload };
