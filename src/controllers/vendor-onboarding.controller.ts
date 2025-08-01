/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  submitVendorApplication,
  getVendorApplication,
  updateVendorApplication,
  uploadBusinessDocument,
  getBusinessDocuments,
  deleteBusinessDocument,
} from '../services/vendor-onboarding.service';
import {
  VendorApplicationSchema,
  VendorApplicationUpdateSchema,
  VendorDocumentUploadSchema,
} from '../schema/vendor-onboarding';
import { getUploadUrl as uploadControllerGetUploadUrl } from '../controllers/upload.controller';
import { asyncHandler } from '../middlewares/error-handler';

/**
 * Submit a new vendor application
 */
export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const applicationData = VendorApplicationSchema.parse(req.body);

  const application = await submitVendorApplication(userId, applicationData);

  res.status(201).json({
    message: 'Vendor application submitted successfully',
    application,
  });
});

/**
 * Get current user's vendor application
 */
export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const application = await getVendorApplication(userId);

  if (!application) {
    return res.status(404).json({
      message: 'No vendor application found',
    });
  }

  res.json({
    message: 'Vendor application retrieved successfully',
    application,
  });
});

/**
 * Update vendor application
 */
export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const updateData = VendorApplicationUpdateSchema.parse(req.body);

  const application = await updateVendorApplication(userId, updateData);

  res.json({
    message: 'Vendor application updated successfully',
    application,
  });
});

/**
 * Upload business document
 */
export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const documentData = VendorDocumentUploadSchema.parse(req.body);

  const document = await uploadBusinessDocument(userId, documentData);

  res.status(201).json({
    message: 'Business document uploaded successfully',
    document,
  });
});

/**
 * Get business documents
 */
export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const documents = await getBusinessDocuments(userId);

  res.json({
    message: 'Business documents retrieved successfully',
    documents,
  });
});

/**
 * Delete business document
 */
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { documentId } = req.params;

  await deleteBusinessDocument(userId, documentId);

  res.json({
    message: 'Business document deleted successfully',
  });
});

/**
 * Get presigned URL for document upload (vendor onboarding)
 */
export const getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  // Use the existing upload controller but without vendor role requirement
  await uploadControllerGetUploadUrl(req, res);
});
