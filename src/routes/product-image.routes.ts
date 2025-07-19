import { Router } from 'express';
import * as ctrl from '../controllers/product-image.controller';
import { registry } from '../lib/openapi';
import { authGuard } from '../middlewares/auth';
import { requireVendor } from '../middlewares/auth';

// OpenAPI registration for product image endpoints
registry.registerPath({
  method: 'post',
  path: '/vendor/products/{productId}/images',
  tags: ['vendor'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Product ID',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fileName: { type: 'string', minLength: 1 },
                fileUrl: { type: 'string', format: 'uri' },
                altText: { type: 'string' },
                isPrimary: { type: 'boolean', default: false },
                sortOrder: { type: 'integer', minimum: 0, default: 0 },
              },
              required: ['fileName', 'fileUrl'],
            },
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Images added successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              addedCount: { type: 'integer' },
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
    404: {
      description: 'Product not found or access denied',
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
  method: 'get',
  path: '/vendor/products/{productId}/images',
  tags: ['vendor'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Product ID',
    },
  ],
  responses: {
    200: {
      description: 'Product images retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                productId: { type: 'string' },
                fileName: { type: 'string' },
                fileUrl: { type: 'string', format: 'uri' },
                altText: { type: 'string' },
                isPrimary: { type: 'boolean' },
                sortOrder: { type: 'integer' },
                createdAt: { type: 'string', format: 'date-time' },
              },
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
  method: 'put',
  path: '/vendor/products/{productId}/images/{imageId}',
  tags: ['vendor'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Product ID',
    },
    {
      name: 'imageId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Image ID',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fileName: { type: 'string', minLength: 1 },
              fileUrl: { type: 'string', format: 'uri' },
              altText: { type: 'string' },
              isPrimary: { type: 'boolean' },
              sortOrder: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              productId: { type: 'string' },
              fileName: { type: 'string' },
              fileUrl: { type: 'string', format: 'uri' },
              altText: { type: 'string' },
              isPrimary: { type: 'boolean' },
              sortOrder: { type: 'integer' },
              createdAt: { type: 'string', format: 'date-time' },
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
    404: {
      description: 'Product image not found or access denied',
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
  path: '/vendor/products/{productId}/images/{imageId}',
  tags: ['vendor'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Product ID',
    },
    {
      name: 'imageId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Image ID',
    },
  ],
  responses: {
    204: {
      description: 'Image deleted successfully',
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
    404: {
      description: 'Product image not found or access denied',
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
  method: 'put',
  path: '/vendor/products/{productId}/images/reorder',
  tags: ['vendor'],
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'productId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Product ID',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              imageIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                description: 'Array of image IDs in desired order',
              },
            },
            required: ['imageIds'],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Images reordered successfully',
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
      description: 'Invalid request - some image IDs do not belong to this product',
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
    404: {
      description: 'Product not found or access denied',
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

// Product image management routes (vendors only)
r.post('/:productId/images', authGuard, requireVendor, ctrl.addProductImages);
r.get('/:productId/images', authGuard, requireVendor, ctrl.getProductImages);
r.put('/:productId/images/:imageId', authGuard, requireVendor, ctrl.updateProductImage);
r.delete('/:productId/images/:imageId', authGuard, requireVendor, ctrl.deleteProductImage);
r.put('/:productId/images/reorder', authGuard, requireVendor, ctrl.reorderProductImages);

export default r;
