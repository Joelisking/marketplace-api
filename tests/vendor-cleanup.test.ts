import { prisma } from '../src/lib/prisma';
import {
  cleanupOrphanedApplications,
  cleanupVendorApplication,
} from '../src/services/vendor-onboarding.service';

describe('Vendor Cleanup Functions', () => {
  let testApplicationId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Create a test vendor application
    const testApplication = await prisma.vendorApplication.create({
      data: {
        userId: 'test-user-id',
        businessName: 'Test Business',
        businessType: 'INDIVIDUAL',
        businessDescription: 'Test business description',
        businessAddress: 'Test Address',
        businessPhone: '1234567890',
        ghanaCardNumber: 'GHA-123456789-X',
        bankName: 'Test Bank',
        bankAccountNumber: '1234567890',
        bankAccountName: 'Test Account',
        bankCode: 'TEST',
        expectedMonthlySales: 'UNDER_1000',
        commissionRate: 5.0,
        productCategories: ['Test Category'],
        status: 'PENDING',
      },
    });

    testApplicationId = testApplication.id;

    // Create a test document
    const testDocument = await prisma.vendorDocument.create({
      data: {
        applicationId: testApplicationId,
        documentType: 'GHANA_CARD',
        fileName: 'test-document.jpg',
        fileUrl: 'https://example.com/test-document.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        side: 'FRONT',
      },
    });

    testDocumentId = testDocument.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.vendorDocument.deleteMany({
        where: {
          applicationId: testApplicationId,
        },
      });
      await prisma.vendorApplication.deleteMany({
        where: {
          id: testApplicationId,
        },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('cleanupVendorApplication', () => {
    it('should cleanup vendor application and all associated documents', async () => {
      // Verify application and document exist
      const application = await prisma.vendorApplication.findUnique({
        where: { id: testApplicationId },
        include: { businessDocuments: true },
      });

      expect(application).toBeTruthy();
      expect(application?.businessDocuments).toHaveLength(1);

      // Perform cleanup
      await cleanupVendorApplication(testApplicationId);

      // Verify application and document are deleted
      const deletedApplication = await prisma.vendorApplication.findUnique({
        where: { id: testApplicationId },
      });
      expect(deletedApplication).toBeNull();

      const deletedDocument = await prisma.vendorDocument.findUnique({
        where: { id: testDocumentId },
      });
      expect(deletedDocument).toBeNull();
    });
  });

  describe('cleanupOrphanedApplications', () => {
    it('should find and cleanup orphaned documents', async () => {
      // Create an orphaned document (without application)
      const orphanedDocument = await prisma.vendorDocument.create({
        data: {
          applicationId: 'non-existent-application-id',
          documentType: 'GHANA_CARD',
          fileName: 'orphaned-document.jpg',
          fileUrl: 'https://example.com/orphaned-document.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          side: 'FRONT',
        },
      });

      // Perform cleanup
      const result = await cleanupOrphanedApplications();

      // Verify orphaned document is cleaned up
      expect(result.cleanedDocuments).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      const deletedOrphanedDocument = await prisma.vendorDocument.findUnique({
        where: { id: orphanedDocument.id },
      });
      expect(deletedOrphanedDocument).toBeNull();
    });
  });
});
