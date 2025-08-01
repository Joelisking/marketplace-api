import { z } from 'zod';

// Vendor Application Schemas
export const VendorApplicationSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessType: z.enum([
    'INDIVIDUAL',
    'SOLE_PROPRIETORSHIP',
    'PARTNERSHIP',
    'LIMITED_LIABILITY_COMPANY',
    'CORPORATION',
    'COOPERATIVE',
    'OTHER',
  ]),
  businessDescription: z.string().min(10).max(1000),
  businessAddress: z.string().min(10).max(200),
  businessPhone: z.string().min(10).max(20),
  taxIdentification: z.string().optional(),
  ghanaCardNumber: z
    .string()
    .regex(/^GHA-\d{9}-\d$/, 'Invalid Ghana Card number format. Expected format: GHA-123456789-1'),
  bankName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(10).max(20),
  bankAccountName: z.string().min(2).max(100),
  bankCode: z.string().min(3).max(10),
  expectedMonthlySales: z.enum([
    'UNDER_1000',
    'ONE_TO_FIVE_THOUSAND',
    'FIVE_TO_TEN_THOUSAND',
    'TEN_TO_FIFTY_THOUSAND',
    'FIFTY_TO_HUNDRED_THOUSAND',
    'OVER_HUNDRED_THOUSAND',
  ]),
  commissionRate: z.number().min(0).max(100).optional(),
  productCategories: z.array(z.string()).min(1).max(10).optional(),
  socialMediaLinks: z
    .object({
      facebook: z.string().url().optional().or(z.literal('')),
      instagram: z.string().url().optional().or(z.literal('')),
      twitter: z.string().url().optional().or(z.literal('')),
      linkedin: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
});

export const VendorApplicationUpdateSchema = VendorApplicationSchema.partial();

export const VendorApplicationQuery = z.object({
  status: z
    .enum(['PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED'])
    .optional(),
  businessType: z
    .enum([
      'INDIVIDUAL',
      'SOLE_PROPRIETORSHIP',
      'PARTNERSHIP',
      'LIMITED_LIABILITY_COMPANY',
      'CORPORATION',
      'COOPERATIVE',
      'OTHER',
    ])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

// Document Upload Schemas
export const VendorDocumentUploadSchema = z.object({
  documentType: z.enum(['GHANA_CARD']),
  side: z.enum(['FRONT', 'BACK']),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1).max(100),
});

export const VendorDocumentQuery = z.object({
  documentType: z
    .enum([
      'BUSINESS_LICENSE',
      'TAX_CLEARANCE',
      'BANK_STATEMENT',
      'IDENTITY_DOCUMENT',
      'UTILITY_BILL',
      'LEASE_AGREEMENT',
      'INSURANCE_CERTIFICATE',
      'OTHER',
    ])
    .optional(),
  isVerified: z.boolean().optional(),
});

// Admin Review Schemas
export const VendorApplicationReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'DOCUMENTS_REQUESTED', 'UNDER_REVIEW']),
  reviewNotes: z.string().min(1).max(1000),
  rejectionReason: z.string().min(1).max(500).optional(),
});

export const VendorDocumentVerificationSchema = z.object({
  isVerified: z.boolean(),
  verificationNotes: z.string().min(1).max(500).optional(),
});

// Response Schemas
export const VendorApplicationResponse = z.object({
  id: z.string(),
  userId: z.string(),
  businessName: z.string(),
  businessType: z.string(),
  businessDescription: z.string(),
  businessAddress: z.string(),
  businessPhone: z.string(),
  taxIdentification: z.string().nullable(),
  ghanaCardNumber: z.string().nullable(),
  bankName: z.string(),
  bankAccountNumber: z.string(),
  bankAccountName: z.string(),
  bankCode: z.string(),
  expectedMonthlySales: z.string(),
  productCategories: z.array(z.string()),
  socialMediaLinks: z.any().nullable(),
  status: z.string(),
  reviewNotes: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  businessDocuments: z.array(
    z.object({
      id: z.string(),
      documentType: z.string(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      isVerified: z.boolean(),
      verificationNotes: z.string().nullable(),
      uploadedAt: z.string(),
      verifiedAt: z.string().nullable(),
      side: z.string().optional(),
    }),
  ),
});

export const VendorDocumentResponse = z.object({
  id: z.string(),
  applicationId: z.string(),
  documentType: z.string(),
  side: z.string().optional(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  isVerified: z.boolean(),
  verificationNotes: z.string().nullable(),
  uploadedAt: z.string(),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable(),
});

export const VendorApplicationListResponse = z.object({
  applications: z.array(VendorApplicationResponse),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

// Status Update Schemas
export const VendorApplicationStatusUpdateSchema = z.object({
  status: z.enum([
    'PENDING',
    'UNDER_REVIEW',
    'DOCUMENTS_REQUESTED',
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
  ]),
  notes: z.string().min(1).max(1000).optional(),
  rejectionReason: z.string().min(1).max(500).optional(),
});

// Dashboard Schemas
export const VendorOnboardingDashboardSchema = z.object({
  totalApplications: z.number(),
  pendingApplications: z.number(),
  approvedApplications: z.number(),
  rejectedApplications: z.number(),
  averageProcessingTime: z.number(), // in days
  applicationsByStatus: z.array(
    z.object({
      status: z.string(),
      count: z.number(),
    }),
  ),
  applicationsByBusinessType: z.array(
    z.object({
      businessType: z.string(),
      count: z.number(),
    }),
  ),
  recentApplications: z.array(VendorApplicationResponse),
});

// Export types
export type VendorApplication = z.infer<typeof VendorApplicationSchema>;
export type VendorApplicationUpdate = z.infer<typeof VendorApplicationUpdateSchema>;
export type VendorApplicationQueryType = z.infer<typeof VendorApplicationQuery>;
export type VendorDocumentUpload = z.infer<typeof VendorDocumentUploadSchema>;
export type VendorDocumentQueryType = z.infer<typeof VendorDocumentQuery>;
export type VendorApplicationReview = z.infer<typeof VendorApplicationReviewSchema>;
export type VendorDocumentVerification = z.infer<typeof VendorDocumentVerificationSchema>;
export type VendorApplicationResponseType = z.infer<typeof VendorApplicationResponse>;
export type VendorDocumentResponseType = z.infer<typeof VendorDocumentResponse>;
export type VendorApplicationListResponseType = z.infer<typeof VendorApplicationListResponse>;
export type VendorApplicationStatusUpdate = z.infer<typeof VendorApplicationStatusUpdateSchema>;
export type VendorOnboardingDashboard = z.infer<typeof VendorOnboardingDashboardSchema>;
