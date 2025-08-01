import { Router } from 'express';
import * as vendorOnboarding from '../controllers/vendor-onboarding.controller';
import * as adminVendorOnboarding from '../controllers/admin-vendor-onboarding.controller';
import { authGuard, requireAdmin } from '../middlewares/auth';
import { registry } from '../lib/openapi';

// Create router
const router = Router();

// User-facing routes (require authentication)
router.post('/application', authGuard, vendorOnboarding.submitApplication);
router.get('/application', authGuard, vendorOnboarding.getApplication);
router.put('/application', authGuard, vendorOnboarding.updateApplication);
router.post('/documents', authGuard, vendorOnboarding.uploadDocument);
router.get('/documents', authGuard, vendorOnboarding.getDocuments);
router.delete('/documents/:documentId', authGuard, vendorOnboarding.deleteDocument);

// Document upload presigned URL (for vendor onboarding - no vendor role required)
router.post('/upload-url', authGuard, vendorOnboarding.getUploadUrl);

// OpenAPI registration for vendor onboarding endpoints
registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/application',
  tags: ['vendor'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              businessName: { type: 'string', minLength: 2, maxLength: 100 },
              businessType: {
                type: 'string',
                enum: [
                  'INDIVIDUAL',
                  'SOLE_PROPRIETORSHIP',
                  'PARTNERSHIP',
                  'LIMITED_LIABILITY_COMPANY',
                  'CORPORATION',
                  'COOPERATIVE',
                  'OTHER',
                ],
              },
              businessDescription: { type: 'string', minLength: 10, maxLength: 1000 },
              businessAddress: { type: 'string', minLength: 10, maxLength: 200 },
              businessPhone: { type: 'string', minLength: 10, maxLength: 20 },
              taxIdentification: { type: 'string', nullable: true },
              ghanaCardNumber: { type: 'string', pattern: '^GHA-\\d{9}-[A-Z]$' },
              bankName: { type: 'string', minLength: 2, maxLength: 100 },
              bankAccountNumber: { type: 'string', minLength: 10, maxLength: 20 },
              bankAccountName: { type: 'string', minLength: 2, maxLength: 100 },
              bankCode: { type: 'string', minLength: 3, maxLength: 10 },
              expectedMonthlySales: {
                type: 'string',
                enum: [
                  'UNDER_1000',
                  'ONE_TO_FIVE_THOUSAND',
                  'FIVE_TO_TEN_THOUSAND',
                  'TEN_TO_FIFTY_THOUSAND',
                  'FIFTY_TO_HUNDRED_THOUSAND',
                  'OVER_HUNDRED_THOUSAND',
                ],
              },
              productCategories: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 10,
                nullable: true,
              },
              socialMediaLinks: {
                type: 'object',
                properties: {
                  facebook: { type: 'string', format: 'uri', nullable: true },
                  instagram: { type: 'string', format: 'uri', nullable: true },
                  twitter: { type: 'string', format: 'uri', nullable: true },
                  linkedin: { type: 'string', format: 'uri', nullable: true },
                },
                nullable: true,
              },
            },
            required: [
              'businessName',
              'businessType',
              'businessDescription',
              'businessAddress',
              'businessPhone',
              'ghanaCardNumber',
              'bankName',
              'bankAccountNumber',
              'bankAccountName',
              'bankCode',
              'expectedMonthlySales',
            ],
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Vendor application submitted successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              application: { type: 'object' }, // See schema for full details
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    409: { description: 'Application already exists' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/documents',
  tags: ['vendor'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              documentType: { type: 'string', enum: ['GHANA_CARD'] },
              side: { type: 'string', enum: ['FRONT', 'BACK'] },
              fileName: { type: 'string', minLength: 1, maxLength: 255 },
              fileUrl: { type: 'string', format: 'uri' },
              fileSize: { type: 'number', minimum: 1 },
              mimeType: { type: 'string', minLength: 1, maxLength: 100 },
            },
            required: ['documentType', 'side', 'fileName', 'fileUrl', 'fileSize', 'mimeType'],
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Business document uploaded successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              document: { type: 'object' }, // See schema for full details
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    409: { description: 'Document already uploaded' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/vendor-onboarding/documents',
  tags: ['vendor'],
  responses: {
    200: {
      description: 'Business documents retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              documents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    documentType: { type: 'string' },
                    fileName: { type: 'string' },
                    fileUrl: { type: 'string', format: 'uri' },
                    fileSize: { type: 'number' },
                    mimeType: { type: 'string' },
                    isVerified: { type: 'boolean' },
                    verificationNotes: { type: 'string', nullable: true },
                    uploadedAt: { type: 'string', format: 'date-time' },
                    verifiedAt: { type: 'string', format: 'date-time', nullable: true },
                    verifiedBy: { type: 'string', nullable: true },
                    applicationId: { type: 'string' },
                    side: { type: 'string', enum: ['FRONT', 'BACK'], nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    404: { description: 'Vendor application not found' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/vendor-onboarding/documents/{documentId}',
  tags: ['vendor'],
  parameters: [
    {
      name: 'documentId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Document ID',
      },
      description: 'Document ID',
    },
  ],
  responses: {
    200: {
      description: 'Business document deleted successfully',
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
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Document not found or access denied' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/upload-url',
  tags: ['vendor'],
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
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
  },
});

// Admin routes (require admin or super admin)
router.get('/admin/applications', authGuard, requireAdmin, adminVendorOnboarding.getApplications);
router.post(
  '/admin/applications/:applicationId/review',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.reviewApplication,
);
router.post(
  '/admin/documents/:documentId/verify',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.verifyDocument,
);
router.get('/admin/dashboard', authGuard, requireAdmin, adminVendorOnboarding.getDashboard);
router.put(
  '/admin/applications/:applicationId/status',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.updateStatus,
);
router.get(
  '/admin/applications/:applicationId',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.getApplicationById,
);

// Cleanup routes (admin only)
router.post(
  '/admin/cleanup/orphaned',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.cleanupOrphaned,
);
router.delete(
  '/admin/applications/:applicationId/cleanup',
  authGuard,
  requireAdmin,
  adminVendorOnboarding.cleanupApplication,
);

// OpenAPI registration for admin endpoints
registry.registerPath({
  method: 'get',
  path: '/vendor-onboarding/admin/applications',
  tags: ['admin'],
  parameters: [
    {
      name: 'status',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: [
          'PENDING',
          'UNDER_REVIEW',
          'DOCUMENTS_REQUESTED',
          'APPROVED',
          'REJECTED',
          'SUSPENDED',
        ],
      },
      description: 'Filter by application status',
    },
    {
      name: 'businessType',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        enum: [
          'INDIVIDUAL',
          'SOLE_PROPRIETORSHIP',
          'PARTNERSHIP',
          'LIMITED_LIABILITY_COMPANY',
          'CORPORATION',
          'COOPERATIVE',
          'OTHER',
        ],
      },
      description: 'Filter by business type',
    },
    {
      name: 'page',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      description: 'Page number for pagination',
    },
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
      description: 'Number of items per page',
    },
    {
      name: 'search',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
      },
      description: 'Search by business name, user email, or Ghana Card number',
    },
  ],
  responses: {
    200: {
      description: 'Vendor applications retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              applications: { type: 'array', items: { type: 'object' } },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/admin/applications/{applicationId}/review',
  tags: ['admin'],
  parameters: [
    {
      name: 'applicationId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Application ID',
      },
      description: 'Application ID',
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['status', 'reviewNotes'],
          properties: {
            status: {
              type: 'string',
              enum: ['APPROVED', 'REJECTED', 'DOCUMENTS_REQUESTED', 'UNDER_REVIEW'],
              description: 'Review decision status',
            },
            reviewNotes: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: 'Review notes and comments',
            },
            rejectionReason: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Reason for rejection (required if status is REJECTED)',
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Vendor application reviewed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              application: { type: 'object' },
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
    404: { description: 'Application not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/vendor-onboarding/admin/applications/{applicationId}',
  tags: ['admin'],
  parameters: [
    {
      name: 'applicationId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Application ID',
      },
      description: 'Application ID',
    },
  ],
  responses: {
    200: {
      description: 'Vendor application retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              application: { type: 'object' },
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
    404: { description: 'Application not found' },
  },
});

registry.registerPath({
  method: 'put',
  path: '/vendor-onboarding/admin/applications/{applicationId}/status',
  tags: ['admin'],
  parameters: [
    {
      name: 'applicationId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Application ID',
      },
      description: 'Application ID',
    },
  ],
  responses: {
    200: {
      description: 'Vendor application status updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              application: { type: 'object' },
            },
          },
        },
      },
    },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
    404: { description: 'Application not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/admin/documents/{documentId}/verify',
  tags: ['admin'],
  parameters: [
    {
      name: 'documentId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Document ID',
      },
      description: 'Document ID',
    },
  ],
  responses: {
    200: {
      description: 'Business document verification not yet implemented',
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
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/vendor-onboarding/admin/dashboard',
  tags: ['admin'],
  responses: {
    200: {
      description: 'Vendor onboarding dashboard retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              dashboard: {
                type: 'object',
                properties: {
                  totalApplications: { type: 'number' },
                  pendingApplications: { type: 'number' },
                  approvedApplications: { type: 'number' },
                  rejectedApplications: { type: 'number' },
                  averageProcessingTime: { type: 'number' },
                  applicationsByStatus: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                  applicationsByBusinessType: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        businessType: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                  recentApplications: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/vendor-onboarding/admin/cleanup/orphaned',
  tags: ['admin'],
  responses: {
    200: {
      description: 'Orphaned applications and documents cleaned up successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              cleanedApplications: { type: 'number' },
              cleanedDocuments: { type: 'number' },
              errors: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    400: { description: 'Cleanup failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/vendor-onboarding/admin/applications/{applicationId}/cleanup',
  tags: ['admin'],
  parameters: [
    {
      name: 'applicationId',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        description: 'Application ID',
      },
      description: 'Application ID',
    },
  ],
  responses: {
    200: {
      description: 'Vendor application cleaned up successfully',
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
    400: { description: 'Cleanup failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Admin access required' },
    404: { description: 'Application not found' },
  },
});

export default router;
