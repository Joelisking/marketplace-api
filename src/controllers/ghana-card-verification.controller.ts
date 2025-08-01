import { Request, Response } from 'express';
import {
  verifyGhanaCardDocument,
  validateGhanaCardImage as validateGhanaCardImageService,
  checkGhanaCardDuplicate,
  generateGhanaCardReport,
  getVerificationServiceStatus,
  GhanaCardValidationSchema,
} from '../services/ghana-card-verification.service';
import { z } from 'zod';

// Validation schema for verification request
const VerificationRequestSchema = z.object({
  ghanaCardNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  imageUrl: z.string().optional(),
});

// Validation schema for image validation request
const ImageValidationRequestSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
});

/**
 * Verify Ghana Card with external APIs
 */
export async function verifyGhanaCard(req: Request, res: Response) {
  try {
    const validationResult = VerificationRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.issues,
      });
    }

    const { ghanaCardNumber, firstName, lastName, dateOfBirth, imageUrl } = validationResult.data;

    // Check for duplicate Ghana Card number
    const duplicateCheck = await checkGhanaCardDuplicate(ghanaCardNumber, req.user?.id as string);
    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Ghana Card number is already registered',
        existingUser: duplicateCheck.existingUser,
      });
    }

    // Verify Ghana Card with external APIs
    const verificationResult = await verifyGhanaCardDocument(
      ghanaCardNumber,
      firstName,
      lastName,
      dateOfBirth,
      imageUrl,
    );

    // Generate verification report
    const report = generateGhanaCardReport(verificationResult);

    return res.status(200).json({
      success: true,
      message: verificationResult.message,
      data: {
        verification: verificationResult,
        report,
      },
    });
  } catch (error) {
    console.error('Ghana Card verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during verification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Validate Ghana Card image with OCR
 */
export async function validateGhanaCardImage(req: Request, res: Response) {
  try {
    const validationResult = ImageValidationRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.issues,
      });
    }

    const { imageUrl } = validationResult.data;

    // Validate Ghana Card image with OCR
    const validationResult_ = await validateGhanaCardImageService(imageUrl);

    return res.status(200).json({
      success: true,
      message: validationResult_.message,
      data: {
        isValid: validationResult_.isValid,
        confidence: validationResult_.confidence,
        extractedData: validationResult_.extractedData,
        verificationMethod: validationResult_.verificationMethod,
      },
    });
  } catch (error) {
    console.error('Ghana Card image validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during image validation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check Ghana Card number format and extract info
 */
export async function validateGhanaCardFormat(req: Request, res: Response) {
  try {
    const { ghanaCardNumber } = req.params;

    if (!ghanaCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ghana Card number is required',
      });
    }

    // Validate format using the service
    const validationResult = GhanaCardValidationSchema.safeParse({
      ghanaCardNumber,
      firstName: 'test', // Dummy values for format validation
      lastName: 'test',
      dateOfBirth: '1990-01-01',
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ghana Card number format',
        errors: validationResult.error.issues,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ghana Card number format is valid',
      data: {
        ghanaCardNumber,
        isValid: true,
      },
    });
  } catch (error) {
    console.error('Ghana Card format validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during format validation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get verification service status
 */
export async function getVerificationStatus(req: Request, res: Response) {
  try {
    const status = getVerificationServiceStatus();

    return res.status(200).json({
      success: true,
      message: 'Verification service status retrieved successfully',
      data: status,
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while getting verification status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check if Ghana Card number is available (not already registered)
 */
export async function checkGhanaCardAvailability(req: Request, res: Response) {
  try {
    const { ghanaCardNumber } = req.params;

    if (!ghanaCardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ghana Card number is required',
      });
    }

    // Check for duplicates
    const duplicateCheck = await checkGhanaCardDuplicate(ghanaCardNumber, req.user?.id as string);

    return res.status(200).json({
      success: true,
      message: duplicateCheck.isDuplicate
        ? 'Ghana Card number is already registered'
        : 'Ghana Card number is available',
      data: {
        ghanaCardNumber,
        isAvailable: !duplicateCheck.isDuplicate,
        isDuplicate: duplicateCheck.isDuplicate,
        existingUser: duplicateCheck.existingUser,
      },
    });
  } catch (error) {
    console.error('Error checking Ghana Card availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking availability',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
