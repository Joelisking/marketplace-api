import { Router } from 'express';
import * as ctrl from '../controllers/upload.controller';
import { registry } from '../lib/openapi';
import { authGuard } from '../middlewares/auth';
import { requireVendor } from '../middlewares/auth';

// OpenAPI registration for upload endpoints
registry.registerPath({
  method: 'post',
  path: '/upload/presigned-url',
  tags: ['upload'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                minLength: 1,
                description: 'Original filename with extension',
              },
              contentType: {
                type: 'string',
                pattern: '^image/',
                description: 'MIME type (must start with image/)',
              },
              fileSize: {
                type: 'integer',
                maximum: 10485760, // 10MB
                description: 'File size in bytes (max 10MB)',
              },
            },
            required: ['fileName', 'contentType', 'fileSize'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Presigned URL generated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              uploadUrl: {
                type: 'string',
                format: 'uri',
                description: 'Presigned URL for uploading the file',
              },
              fileUrl: {
                type: 'string',
                format: 'uri',
                description: 'Public URL where the file will be accessible',
              },
              fileName: {
                type: 'string',
                description: 'Generated unique filename',
              },
              expiresIn: {
                type: 'integer',
                description: 'URL expiration time in seconds',
              },
            },
            required: ['uploadUrl', 'fileUrl', 'fileName', 'expiresIn'],
          },
        },
      },
    },
    400: {
      description: 'Invalid upload request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    403: {
      description: 'Vendor role required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/upload/delete',
  tags: ['upload'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                minLength: 1,
                description: 'Filename to delete',
              },
            },
            required: ['fileName'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image deleted successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    400: {
      description: 'Invalid delete request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    403: {
      description: 'Vendor role required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

const r = Router();

// Generate presigned URL for image upload (vendors only)
r.post('/presigned-url', authGuard, requireVendor, ctrl.getUploadUrl);

// Delete uploaded image (vendors only)
r.delete('/delete', authGuard, requireVendor, ctrl.deleteUploadedImage);

export default r;
