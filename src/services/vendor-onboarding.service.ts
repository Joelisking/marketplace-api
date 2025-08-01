/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import {
  VendorApplicationSchema,
  VendorApplicationUpdateSchema,
  VendorApplicationQuery,
  VendorDocumentUploadSchema,
  VendorApplicationReviewSchema,
  VendorApplicationResponse,
  VendorDocumentResponse,
  VendorApplicationListResponse,
  VendorApplicationStatusUpdateSchema,
  VendorOnboardingDashboardSchema,
} from '../schema/vendor-onboarding';
import {
  createNotification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './notification.service';
import { Prisma } from '@prisma/client';

/**
 * Create a store for a vendor using their business information
 */
async function createVendorStore(
  userId: string,
  businessName: string,
  businessDescription: string,
  bankInfo?: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankCode: string;
  },
) {
  // Check if user already has a store
  const existingStore = await prisma.store.findFirst({
    where: { owner: { id: userId } },
  });

  if (existingStore) {
    return existingStore; // Return existing store if user already has one
  }

  // Create a store for the vendor using their business information
  const storeSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Ensure unique slug
  let finalSlug = storeSlug;
  let counter = 1;
  while (await prisma.store.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${storeSlug}-${counter}`;
    counter++;
  }

  const store = await prisma.store.create({
    data: {
      name: businessName,
      slug: finalSlug,
      description: businessDescription,
      owner: { connect: { id: userId } },
      vendorId: userId, // Set vendorId for consistency
    },
  });

  // Create Paystack sub-account if bank information is provided
  if (bankInfo) {
    try {
      const { createVendorPaystackAccount } = await import('./vendor-payment.service');

      await createVendorPaystackAccount({
        vendorId: userId,
        storeId: store.id,
        businessName: businessName,
        accountNumber: bankInfo.bankAccountNumber,
        bankCode: bankInfo.bankCode,
        percentageCharge: 5, // Default 5% platform fee
      });

      console.log(
        `Paystack sub-account created successfully for vendor ${userId} and store ${store.id}`,
      );
    } catch (error) {
      console.error(`Failed to create Paystack sub-account for vendor ${userId}:`, error);
      // Don't fail the store creation if Paystack sub-account creation fails
      // The vendor can manually create it later through their dashboard
    }
  }

  return store;
}

/**
 * Submit a new vendor application
 */
export async function submitVendorApplication(
  userId: string,
  applicationData: z.infer<typeof VendorApplicationSchema>,
): Promise<z.infer<typeof VendorApplicationResponse>> {
  // Check if user already has an application
  const existingApplication = await prisma.vendorApplication.findUnique({
    where: { userId },
    include: {
      businessDocuments: {
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  // If application exists and is not a draft, throw error
  if (existingApplication && existingApplication.businessName !== 'Draft Application') {
    throw new Error('You already have a vendor application submitted');
  }

  // Check if user is already a vendor
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'VENDOR') {
    throw new Error('You are already a vendor');
  }

  // Validate Ghana Card number format
  if (!applicationData.ghanaCardNumber) {
    throw new Error('Ghana Card number is required for all vendor applications');
  }

  let application;

  if (existingApplication && existingApplication.businessName === 'Draft Application') {
    // Update existing draft application
    application = await prisma.vendorApplication.update({
      where: { id: existingApplication.id },
      data: {
        businessName: applicationData.businessName,
        businessType: applicationData.businessType,
        businessDescription: applicationData.businessDescription,
        businessAddress: applicationData.businessAddress,
        businessPhone: applicationData.businessPhone,
        taxIdentification: applicationData.taxIdentification ?? null,
        ghanaCardNumber: applicationData.ghanaCardNumber,
        bankName: applicationData.bankName,
        bankAccountNumber: applicationData.bankAccountNumber,
        bankAccountName: applicationData.bankAccountName,
        bankCode: applicationData.bankCode,
        commissionRate: 5.0,
        expectedMonthlySales: applicationData.expectedMonthlySales,
        productCategories: applicationData.productCategories ?? [],
        socialMediaLinks: applicationData.socialMediaLinks ?? Prisma.JsonNull,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        businessDocuments: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            isVerified: true,
            verificationNotes: true,
            uploadedAt: true,
            verifiedAt: true,
            verifiedBy: true,
            applicationId: true,
            side: true,
          },
        },
      },
    });
  } else {
    // Create new application
    application = await prisma.vendorApplication.create({
      data: {
        userId,
        businessName: applicationData.businessName,
        businessType: applicationData.businessType,
        businessDescription: applicationData.businessDescription,
        businessAddress: applicationData.businessAddress,
        businessPhone: applicationData.businessPhone,
        taxIdentification: applicationData.taxIdentification ?? null,
        ghanaCardNumber: applicationData.ghanaCardNumber,
        bankName: applicationData.bankName,
        bankAccountNumber: applicationData.bankAccountNumber,
        bankAccountName: applicationData.bankAccountName,
        bankCode: applicationData.bankCode,
        commissionRate: 5.0,
        expectedMonthlySales: applicationData.expectedMonthlySales,
        productCategories: applicationData.productCategories ?? [],
        socialMediaLinks: applicationData.socialMediaLinks ?? Prisma.JsonNull,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        businessDocuments: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            isVerified: true,
            verificationNotes: true,
            uploadedAt: true,
            verifiedAt: true,
            verifiedBy: true,
            applicationId: true,
            side: true,
          },
        },
      },
    });
  }

  // Send notification to admins
  try {
    await createNotification({
      userId: 'admin', // This would be sent to all admins
      type: NotificationType.VENDOR_APPLICATION_SUBMITTED,
      title: 'New Vendor Application',
      message: `New vendor application submitted by ${application.businessName}`,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }

  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt ? application.updatedAt.toISOString() : null,
    approvedAt: application.approvedAt ? application.approvedAt.toISOString() : null,
    rejectedAt: application.rejectedAt ? application.rejectedAt.toISOString() : null,
    reviewedAt: application.reviewedAt ? application.reviewedAt.toISOString() : null,
    businessDocuments: application.businessDocuments.map((doc: any) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      side: doc.side ? String(doc.side) : undefined,
    })),
    user: application.user,
  } as z.infer<typeof VendorApplicationResponse>;
}

/**
 * Get vendor application by user ID
 */
export async function getVendorApplication(
  userId: string,
): Promise<z.infer<typeof VendorApplicationResponse> | null> {
  const application = await prisma.vendorApplication.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  return application as z.infer<typeof VendorApplicationResponse> | null;
}

/**
 * Update vendor application
 */
export async function updateVendorApplication(
  userId: string,
  updateData: z.infer<typeof VendorApplicationUpdateSchema>,
): Promise<z.infer<typeof VendorApplicationResponse>> {
  const application = await prisma.vendorApplication.findUnique({
    where: { userId },
  });

  if (!application) {
    throw new Error('Vendor application not found');
  }

  if (application.status !== 'PENDING' && application.status !== 'DOCUMENTS_REQUESTED') {
    throw new Error('Cannot update application in current status');
  }

  const updatedApplication = await prisma.vendorApplication.update({
    where: { userId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  return {
    ...updatedApplication,
    createdAt: updatedApplication.createdAt.toISOString(),
    updatedAt: updatedApplication.updatedAt ? updatedApplication.updatedAt.toISOString() : '',
    approvedAt: updatedApplication.approvedAt ? updatedApplication.approvedAt.toISOString() : null,
    rejectedAt: updatedApplication.rejectedAt ? updatedApplication.rejectedAt.toISOString() : null,
    reviewedAt: updatedApplication.reviewedAt ? updatedApplication.reviewedAt.toISOString() : null,
    businessDocuments: updatedApplication.businessDocuments.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      side: doc.side ? String(doc.side) : undefined,
    })),
    user: updatedApplication.user,
  } as z.infer<typeof VendorApplicationResponse>;
}

/**
 * Upload business document
 */
export async function uploadBusinessDocument(
  userId: string,
  documentData: z.infer<typeof VendorDocumentUploadSchema>,
): Promise<z.infer<typeof VendorDocumentResponse>> {
  let application = await prisma.vendorApplication.findUnique({
    where: { userId },
  });

  // If no application exists, create a draft application for document uploads
  if (!application) {
    application = await prisma.vendorApplication.create({
      data: {
        userId,
        status: 'PENDING',
        businessName: 'Draft Application',
        businessType: 'INDIVIDUAL',
        businessDescription: 'Draft application created for document upload',
        businessAddress: 'To be completed',
        businessPhone: 'To be completed',
        ghanaCardNumber: 'To be completed',
        bankName: 'To be completed',
        bankAccountNumber: 'To be completed',
        bankAccountName: 'To be completed',
        bankCode: 'To be completed',
        expectedMonthlySales: 'UNDER_1000',
        commissionRate: 5,
      },
    });
  }

  // Only allow Ghana Card uploads
  if (documentData.documentType !== 'GHANA_CARD') {
    throw new Error('Only Ghana Card images are accepted for vendor onboarding.');
  }

  // Check if this side has already been uploaded
  const existingGhanaCardSide = await prisma.vendorDocument.findFirst({
    where: {
      applicationId: application.id,
      documentType: 'GHANA_CARD',
      side: documentData.side,
    },
  });

  if (existingGhanaCardSide) {
    throw new Error(
      `Ghana Card ${documentData.side.toLowerCase()} image has already been uploaded`,
    );
  }

  const document = await prisma.vendorDocument.create({
    data: {
      applicationId: application.id,
      ...documentData,
      side: documentData.side,
    },
  });

  // Convert date fields to string for response type compatibility
  return {
    ...document,
    uploadedAt: document.uploadedAt.toISOString(),
    verifiedAt: document.verifiedAt ? document.verifiedAt.toISOString() : null,
    side: document.side ? String(document.side) : undefined,
  } as z.infer<typeof VendorDocumentResponse>;
}

/**
 * Get business documents for an application
 */
export async function getBusinessDocuments(
  userId: string,
): Promise<z.infer<typeof VendorDocumentResponse>[]> {
  const application = await prisma.vendorApplication.findUnique({
    where: { userId },
    include: {
      businessDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  if (!application) {
    // Return empty array if no application exists yet
    return [];
  }

  return application.businessDocuments.map((doc) => ({
    ...doc,
    uploadedAt: doc.uploadedAt.toISOString(),
    verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
    side: doc.side ? String(doc.side) : undefined,
  })) as z.infer<typeof VendorDocumentResponse>[];
}

/**
 * Get all vendor applications (admin only)
 */
export async function getAllVendorApplications(
  query: z.infer<typeof VendorApplicationQuery>,
): Promise<z.infer<typeof VendorApplicationListResponse>> {
  const { status, businessType, page, limit, search } = VendorApplicationQuery.parse(query);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (businessType) {
    where.businessType = businessType;
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { ghanaCardNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [applications, total] = await Promise.all([
    prisma.vendorApplication.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        businessDocuments: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            isVerified: true,
            verificationNotes: true,
            uploadedAt: true,
            verifiedAt: true,
            verifiedBy: true,
            applicationId: true,
            side: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vendorApplication.count({ where }),
  ]);

  return {
    applications: applications.map((app) => ({
      ...app,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt ? app.updatedAt.toISOString() : null,
      approvedAt: app.approvedAt ? app.approvedAt.toISOString() : null,
      rejectedAt: app.rejectedAt ? app.rejectedAt.toISOString() : null,
      reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
      businessDocuments: app.businessDocuments.map((doc) => ({
        ...doc,
        uploadedAt: doc.uploadedAt.toISOString(),
        verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
        side: doc.side ? String(doc.side) : undefined,
      })),
      user: app.user,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  } as z.infer<typeof VendorApplicationListResponse>;
}

/**
 * Review vendor application (admin only)
 */
export async function reviewVendorApplication(
  applicationId: string,
  reviewerId: string,
  reviewData: z.infer<typeof VendorApplicationReviewSchema>,
): Promise<z.infer<typeof VendorApplicationResponse>> {
  const { status, reviewNotes, rejectionReason } = VendorApplicationReviewSchema.parse(reviewData);

  const application = await prisma.vendorApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      businessDocuments: true,
    },
  });

  if (!application) {
    throw new Error('Vendor application not found');
  }

  // Check Ghana Card FRONT and BACK requirement for approval
  if (status === 'APPROVED') {
    const ghanaCardFront = application.businessDocuments.find(
      (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'FRONT',
    );
    const ghanaCardBack = application.businessDocuments.find(
      (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'BACK',
    );
    if (!ghanaCardFront || !ghanaCardBack) {
      throw new Error(
        'Both front and back images of the Ghana Card must be uploaded before approval',
      );
    }
  }

  const updateData: any = {
    status,
    reviewNotes,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
  };

  if (status === 'APPROVED') {
    updateData.approvedAt = new Date();
  } else if (status === 'REJECTED') {
    updateData.rejectedAt = new Date();
    updateData.rejectionReason = rejectionReason;
  }

  // Update application status
  const updatedApplication = await prisma.vendorApplication.update({
    where: { id: applicationId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  // If application is approved, update user role to VENDOR and create store
  if (status === 'APPROVED') {
    // Update user role to VENDOR
    await prisma.user.update({
      where: { id: application.userId },
      data: { role: 'VENDOR' },
    });

    // Create store for the vendor with Paystack sub-account
    await createVendorStore(
      application.userId,
      application.businessName,
      application.businessDescription,
      {
        bankName: application.bankName,
        bankAccountNumber: application.bankAccountNumber,
        bankAccountName: application.bankAccountName,
        bankCode: application.bankCode,
      },
    );
  }

  // Send notification to vendor
  try {
    const notificationType =
      status === 'APPROVED'
        ? NotificationType.VENDOR_APPLICATION_APPROVED
        : NotificationType.VENDOR_APPLICATION_STATUS_UPDATED;
    const notificationTitle =
      status === 'APPROVED' ? 'Application Approved' : 'Application Status Updated';
    const notificationMessage =
      status === 'APPROVED'
        ? 'Your vendor application has been approved! You are now a vendor and your store has been created. You can start adding products and managing your business.'
        : `Your vendor application has been ${status} for the following reason: ${rejectionReason}.`;

    await createNotification({
      userId: application.userId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    });
  } catch (error) {
    console.error('Failed to send vendor notification:', error);
  }

  return {
    ...updatedApplication,
    createdAt: updatedApplication.createdAt.toISOString(),
    updatedAt: updatedApplication.updatedAt ? updatedApplication.updatedAt.toISOString() : null,
    approvedAt: updatedApplication.approvedAt ? updatedApplication.approvedAt.toISOString() : null,
    rejectedAt: updatedApplication.rejectedAt ? updatedApplication.rejectedAt.toISOString() : null,
    reviewedAt: updatedApplication.reviewedAt ? updatedApplication.reviewedAt.toISOString() : null,
    businessDocuments: updatedApplication.businessDocuments.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      side: doc.side ? String(doc.side) : undefined,
    })),
    user: updatedApplication.user,
  } as z.infer<typeof VendorApplicationResponse>;
}

/**
 * Get vendor application by ID (admin only)
 */
export async function getVendorApplicationById(
  applicationId: string,
): Promise<z.infer<typeof VendorApplicationResponse> | null> {
  const application = await prisma.vendorApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  if (!application) {
    return null;
  }

  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt ? application.updatedAt.toISOString() : null,
    approvedAt: application.approvedAt ? application.approvedAt.toISOString() : null,
    rejectedAt: application.rejectedAt ? application.rejectedAt.toISOString() : null,
    reviewedAt: application.reviewedAt ? application.reviewedAt.toISOString() : null,
    businessDocuments: application.businessDocuments.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      side: doc.side ? String(doc.side) : undefined,
    })),
    user: application.user,
  } as z.infer<typeof VendorApplicationResponse>;
}

/**
 * Update vendor application status (admin only)
 */
export async function updateVendorApplicationStatus(
  applicationId: string,
  adminId: string,
  statusData: z.infer<typeof VendorApplicationStatusUpdateSchema>,
): Promise<z.infer<typeof VendorApplicationResponse>> {
  const { status, notes, rejectionReason } = VendorApplicationStatusUpdateSchema.parse(statusData);

  const application = await prisma.vendorApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      businessDocuments: true,
    },
  });

  if (!application) {
    throw new Error('Vendor application not found');
  }

  // Check Ghana Card FRONT and BACK requirement for approval
  if (status === 'APPROVED') {
    const ghanaCardFront = application.businessDocuments.find(
      (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'FRONT',
    );
    const ghanaCardBack = application.businessDocuments.find(
      (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'BACK',
    );
    if (!ghanaCardFront || !ghanaCardBack) {
      throw new Error(
        'Both front and back images of the Ghana Card must be uploaded before approval',
      );
    }
  }

  const updateData: any = {
    status,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  };

  if (notes) {
    updateData.reviewNotes = notes;
  }

  if (status === 'APPROVED') {
    updateData.approvedAt = new Date();
  } else if (status === 'REJECTED') {
    updateData.rejectedAt = new Date();
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
  }

  // Update application status
  const updatedApplication = await prisma.vendorApplication.update({
    where: { id: applicationId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          verifiedBy: true,
          applicationId: true,
          side: true,
        },
      },
    },
  });

  // If application is approved, update user role to VENDOR and create store
  if (status === 'APPROVED') {
    // Update user role to VENDOR
    await prisma.user.update({
      where: { id: application.userId },
      data: { role: 'VENDOR' },
    });

    // Create store for the vendor with Paystack sub-account
    await createVendorStore(
      application.userId,
      application.businessName,
      application.businessDescription,
      {
        bankName: application.bankName,
        bankAccountNumber: application.bankAccountNumber,
        bankAccountName: application.bankAccountName,
        bankCode: application.bankCode,
      },
    );
  }

  // Send notification to vendor
  try {
    const notificationType =
      status === 'APPROVED'
        ? NotificationType.VENDOR_APPLICATION_APPROVED
        : NotificationType.VENDOR_APPLICATION_STATUS_UPDATED;
    const notificationTitle =
      status === 'APPROVED' ? 'Application Approved' : 'Application Status Updated';
    const notificationMessage =
      status === 'APPROVED'
        ? 'Your vendor application has been approved! You are now a vendor and your store has been created. You can start adding products and managing your business.'
        : `Your vendor application status has been updated to ${status}.`;

    await createNotification({
      userId: application.userId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    });
  } catch (error) {
    console.error('Failed to send vendor notification:', error);
  }

  return {
    ...updatedApplication,
    createdAt: updatedApplication.createdAt.toISOString(),
    updatedAt: updatedApplication.updatedAt ? updatedApplication.updatedAt.toISOString() : null,
    approvedAt: updatedApplication.approvedAt ? updatedApplication.approvedAt.toISOString() : null,
    rejectedAt: updatedApplication.rejectedAt ? updatedApplication.rejectedAt.toISOString() : null,
    reviewedAt: updatedApplication.reviewedAt ? updatedApplication.reviewedAt.toISOString() : null,
    businessDocuments: updatedApplication.businessDocuments.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      side: doc.side ? String(doc.side) : undefined,
    })),
    user: updatedApplication.user,
  } as z.infer<typeof VendorApplicationResponse>;
}

/**
 * Delete a business document (removes from database and cloud storage)
 */
export async function deleteBusinessDocument(userId: string, documentId: string): Promise<void> {
  // Find the document and verify ownership
  const document = await prisma.vendorDocument.findFirst({
    where: {
      id: documentId,
      application: {
        userId: userId,
      },
    },
    include: {
      application: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Delete the file from cloud storage
  try {
    const { deleteImage } = await import('./upload.service');
    await deleteImage({
      fileName: document.fileName,
    });
  } catch (error) {
    console.error('Failed to delete file from cloud storage:', error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete the document from database
  await prisma.vendorDocument.delete({
    where: {
      id: documentId,
    },
  });
}

/**
 * Clean up vendor application and all associated documents
 * This function deletes all files from cloud storage before deleting the application
 */
export async function cleanupVendorApplication(applicationId: string): Promise<void> {
  // Get all documents for this application
  const documents = await prisma.vendorDocument.findMany({
    where: {
      applicationId: applicationId,
    },
    select: {
      id: true,
      fileName: true,
    },
  });

  // Delete all files from cloud storage
  const { deleteImage } = await import('./upload.service');

  for (const document of documents) {
    try {
      await deleteImage({
        fileName: document.fileName,
      });
    } catch (error) {
      console.error(`Failed to delete file ${document.fileName} from cloud storage:`, error);
      // Continue with other files even if one fails
    }
  }

  // Delete the application (this will cascade delete all documents from database)
  await prisma.vendorApplication.delete({
    where: {
      id: applicationId,
    },
  });
}

/**
 * Find and cleanup orphaned vendor applications
 * This function finds applications that have been deleted but still have documents in cloud storage
 */
export async function cleanupOrphanedApplications(): Promise<{
  cleanedApplications: number;
  cleanedDocuments: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let cleanedApplications = 0;
  let cleanedDocuments = 0;

  try {
    // Find all vendor documents that don't have a corresponding application
    // This would happen if the application was deleted but documents weren't cleaned up
    const orphanedDocuments = await prisma.vendorDocument.findMany({
      where: {
        applicationId: {
          notIn: await prisma.vendorApplication
            .findMany({
              select: { id: true },
            })
            .then((apps) => apps.map((app) => app.id)),
        },
      },
      select: {
        id: true,
        fileName: true,
      },
    });

    // Delete orphaned documents from cloud storage and database
    const { deleteImage } = await import('./upload.service');

    for (const document of orphanedDocuments) {
      try {
        // Delete from cloud storage
        await deleteImage({
          fileName: document.fileName,
        });

        // Delete from database
        await prisma.vendorDocument.delete({
          where: {
            id: document.id,
          },
        });

        cleanedDocuments++;
      } catch (error) {
        const errorMsg = `Failed to cleanup orphaned document ${document.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Find applications that might have failed during creation
    // These would be applications with no documents and in PENDING status for more than 24 hours
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const failedApplications = await prisma.vendorApplication.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffDate,
        },
        businessDocuments: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    });

    // Delete failed applications
    for (const application of failedApplications) {
      try {
        await prisma.vendorApplication.delete({
          where: {
            id: application.id,
          },
        });
        cleanedApplications++;
      } catch (error) {
        const errorMsg = `Failed to cleanup failed application ${application.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to cleanup orphaned applications: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return {
    cleanedApplications,
    cleanedDocuments,
    errors,
  };
}

/**
 * Cleanup a specific vendor application by ID (admin only)
 */
export async function cleanupVendorApplicationById(applicationId: string): Promise<void> {
  const application = await prisma.vendorApplication.findUnique({
    where: {
      id: applicationId,
    },
    include: {
      businessDocuments: {
        select: {
          id: true,
          fileName: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error('Vendor application not found');
  }

  await cleanupVendorApplication(applicationId);
}

/**
 * Get vendor onboarding dashboard statistics (admin only)
 */
export async function getVendorOnboardingDashboard(): Promise<
  z.infer<typeof VendorOnboardingDashboardSchema>
> {
  // Get total applications
  const totalApplications = await prisma.vendorApplication.count();

  // Get applications by status
  const applicationsByStatus = await prisma.vendorApplication.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
  });

  // Get applications by business type
  const applicationsByBusinessType = await prisma.vendorApplication.groupBy({
    by: ['businessType'],
    _count: {
      businessType: true,
    },
  });

  // Calculate pending applications
  const pendingApplications = await prisma.vendorApplication.count({
    where: { status: 'PENDING' },
  });

  // Calculate approved applications
  const approvedApplications = await prisma.vendorApplication.count({
    where: { status: 'APPROVED' },
  });

  // Calculate rejected applications
  const rejectedApplications = await prisma.vendorApplication.count({
    where: { status: 'REJECTED' },
  });

  // Calculate average processing time (for completed applications)
  const completedApplications = await prisma.vendorApplication.findMany({
    where: {
      OR: [
        { status: 'APPROVED', approvedAt: { not: null } },
        { status: 'REJECTED', rejectedAt: { not: null } },
      ],
    },
    select: {
      createdAt: true,
      approvedAt: true,
      rejectedAt: true,
    },
  });

  let totalProcessingTime = 0;
  let processedCount = 0;

  for (const app of completedApplications) {
    const startDate = new Date(app.createdAt);
    const endDate = app.approvedAt ? new Date(app.approvedAt) : new Date(app.rejectedAt!);
    const processingTime = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24); // in days
    totalProcessingTime += processingTime;
    processedCount++;
  }

  const averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

  // Get recent applications (last 10)
  const recentApplications = await prisma.vendorApplication.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      businessDocuments: {
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          isVerified: true,
          verificationNotes: true,
          uploadedAt: true,
          verifiedAt: true,
          side: true,
        },
      },
    },
  });

  return {
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    averageProcessingTime: Math.round(averageProcessingTime * 100) / 100, // Round to 2 decimal places
    applicationsByStatus: applicationsByStatus.map((item) => ({
      status: item.status,
      count: item._count.status,
    })),
    applicationsByBusinessType: applicationsByBusinessType.map((item) => ({
      businessType: item.businessType,
      count: item._count.businessType,
    })),
    recentApplications: recentApplications.map((app) => ({
      id: app.id,
      userId: app.userId,
      businessName: app.businessName,
      businessType: app.businessType,
      businessDescription: app.businessDescription,
      businessAddress: app.businessAddress,
      businessPhone: app.businessPhone,
      taxIdentification: app.taxIdentification,
      ghanaCardNumber: app.ghanaCardNumber,
      bankName: app.bankName,
      bankAccountNumber: app.bankAccountNumber,
      bankAccountName: app.bankAccountName,
      bankCode: app.bankCode,
      expectedMonthlySales: app.expectedMonthlySales,
      productCategories: app.productCategories,
      socialMediaLinks: app.socialMediaLinks,
      status: app.status,
      reviewNotes: app.reviewNotes,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt?.toISOString() || null,
      approvedAt: app.approvedAt?.toISOString() || null,
      rejectedAt: app.rejectedAt?.toISOString() || null,
      rejectionReason: app.rejectionReason,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      user: app.user,
      businessDocuments: app.businessDocuments.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        isVerified: doc.isVerified,
        verificationNotes: doc.verificationNotes,
        uploadedAt: doc.uploadedAt.toISOString(),
        verifiedAt: doc.verifiedAt?.toISOString() || null,
        side: doc.side || undefined,
      })),
    })),
  };
}
