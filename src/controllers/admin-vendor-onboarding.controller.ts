/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getAllVendorApplications,
  reviewVendorApplication,
  getVendorApplicationById,
  updateVendorApplicationStatus,
  cleanupOrphanedApplications,
  cleanupVendorApplicationById,
  getVendorOnboardingDashboard,
} from '../services/vendor-onboarding.service';
import {
  VendorApplicationQuery,
  VendorApplicationReviewSchema,
  VendorApplicationStatusUpdateSchema,
} from '../schema/vendor-onboarding';

/**
 * Get all vendor applications (admin only)
 */
export async function getApplications(req: Request, res: Response) {
  try {
    const query = VendorApplicationQuery.parse(req.query);

    const result = await getAllVendorApplications(query);

    res.json({
      message: 'Vendor applications retrieved successfully',
      applications: result.applications,
      pagination: result.meta,
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to get applications',
    });
  }
}

/**
 * Review vendor application (admin only)
 */
export async function reviewApplication(req: Request, res: Response) {
  try {
    const adminId = (req as any).user.id;
    const { applicationId } = req.params;
    const reviewData = VendorApplicationReviewSchema.parse(req.body);

    const application = await reviewVendorApplication(applicationId, adminId, reviewData);

    res.json({
      message: 'Vendor application reviewed successfully',
      application,
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to review application',
    });
  }
}

/**
 * Verify business document (admin only)
 */
export async function verifyDocument(req: Request, res: Response) {
  try {
    // This function is not defined in the service, so it will be removed.
    // const verifierId = (req as any).user.id;
    // const { documentId } = req.params;
    // const verificationData = VendorDocumentVerificationSchema.parse(req.body);

    res.json({
      message: 'Business document verification not yet implemented',
      // document, // This line will be removed
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to verify document',
    });
  }
}

/**
 * Get vendor onboarding dashboard (admin only)
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const dashboard = await getVendorOnboardingDashboard();

    res.json({
      message: 'Vendor onboarding dashboard retrieved successfully',
      dashboard,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to get dashboard',
    });
  }
}

/**
 * Update application status (admin only)
 */
export async function updateStatus(req: Request, res: Response) {
  try {
    const adminId = (req as any).user.id;
    const { applicationId } = req.params;
    const statusData = VendorApplicationStatusUpdateSchema.parse(req.body);

    const application = await updateVendorApplicationStatus(applicationId, adminId, statusData);

    res.json({
      message: 'Vendor application status updated successfully',
      application,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to update status',
    });
  }
}

/**
 * Get vendor application by ID (admin only)
 */
export async function getApplicationById(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const application = await getVendorApplicationById(applicationId);

    if (!application) {
      return res.status(404).json({
        message: 'Vendor application not found',
      });
    }

    res.json({
      message: 'Vendor application retrieved successfully',
      application,
    });
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to get application',
    });
  }
}

/**
 * Cleanup orphaned vendor applications and documents (admin only)
 */
export async function cleanupOrphaned(req: Request, res: Response) {
  try {
    const result = await cleanupOrphanedApplications();

    res.json({
      message: 'Cleanup completed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Cleanup orphaned error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to cleanup orphaned applications',
    });
  }
}

/**
 * Cleanup specific vendor application by ID (admin only)
 */
export async function cleanupApplication(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    await cleanupVendorApplicationById(applicationId);

    res.json({
      message: 'Vendor application cleaned up successfully',
    });
  } catch (error) {
    console.error('Cleanup application error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to cleanup application',
    });
  }
}
