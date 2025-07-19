import { Router } from 'express';
import * as ctrl from '../controllers/enhanced-upload.controller';
import { authGuard, requireVendor } from '../middlewares/auth';
import { registry } from '../lib/openapi';

// OpenAPI registration for enhanced upload endpoints
registry.registerPath({
  method: 'post',
  path: '/enhanced-upload/url',
  tags: ['enhanced-upload'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fileName: { type: 'string' },
              contentType: { type: 'string' },
              fileSize: { type: 'number' },
              processingOptions: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                  quality: { type: 'number' },
                  format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
                  fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
                  position: { type: 'string' },
                  background: { type: 'string' },
                  stripMetadata: { type: 'boolean' },
                },
              },
              generateThumbnail: { type: 'boolean' },
            },
            required: ['fileName', 'contentType', 'fileSize'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Enhanced upload URL generated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              uploadUrl: { type: 'string' },
              fileUrl: { type: 'string' },
              fileName: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              thumbnailFileName: { type: 'string' },
              optimizedFormat: { type: 'string' },
              originalFormat: { type: 'string' },
              width: { type: 'number' },
              height: { type: 'number' },
              size: { type: 'number' },
              thumbnailSize: { type: 'number' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/enhanced-upload/direct',
  tags: ['enhanced-upload'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              image: { type: 'string', format: 'binary' },
              processingOptions: { type: 'string' },
            },
            required: ['image'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image uploaded and processed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              fileUrl: { type: 'string' },
              fileName: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              optimizedFormat: { type: 'string' },
              originalFormat: { type: 'string' },
              width: { type: 'number' },
              height: { type: 'number' },
              size: { type: 'number' },
              thumbnailSize: { type: 'number' },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/enhanced-upload/bulk',
  tags: ['enhanced-upload'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              images: { type: 'array', items: { type: 'string', format: 'binary' } },
              processingOptions: { type: 'string' },
            },
            required: ['images'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bulk images uploaded and processed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fileUrl: { type: 'string' },
                    fileName: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    optimizedFormat: { type: 'string' },
                    originalFormat: { type: 'string' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    size: { type: 'number' },
                  },
                },
              },
              summary: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  successful: { type: 'number' },
                  failed: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/enhanced-upload/capabilities',
  tags: ['enhanced-upload'],
  responses: {
    200: {
      description: 'Image processing capabilities',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              supportedFormats: { type: 'array', items: { type: 'string' } },
              recommendedFormat: { type: 'string' },
              maxFileSize: { type: 'number' },
              maxDimensions: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              thumbnailDimensions: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              qualitySettings: {
                type: 'object',
                properties: {
                  jpeg: { type: 'number' },
                  webp: { type: 'number' },
                  avif: { type: 'number' },
                },
              },
              features: {
                type: 'object',
                properties: {
                  imageResizing: { type: 'boolean' },
                  formatConversion: { type: 'boolean' },
                  qualityOptimization: { type: 'boolean' },
                  thumbnailGeneration: { type: 'boolean' },
                  metadataStripping: { type: 'boolean' },
                  bulkUpload: { type: 'boolean' },
                  cdnIntegration: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/enhanced-upload/responsive',
  tags: ['enhanced-upload'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string' },
              sizes: { type: 'array', items: { type: 'string' } },
            },
            required: ['imageUrl'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Responsive image URLs generated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              responsiveUrls: {
                type: 'object',
                properties: {
                  original: { type: 'string' },
                  thumbnail: { type: 'string' },
                  small: { type: 'string' },
                  medium: { type: 'string' },
                  large: { type: 'string' },
                },
              },
              sizes: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
});

const r = Router();

// Enhanced upload routes
r.post('/enhanced-upload/url', authGuard, requireVendor, ctrl.getEnhancedUploadUrl);
r.post('/enhanced-upload/direct', authGuard, requireVendor, ctrl.uploadAndProcessImage);
r.post('/enhanced-upload/bulk', authGuard, requireVendor, ctrl.bulkUploadImages);
r.get('/enhanced-upload/capabilities', ctrl.getImageCapabilities);
r.post('/enhanced-upload/responsive', ctrl.generateResponsiveUrls);

export default r;
