// Jest test file
import { PrismaClient } from '@prisma/client';
import { reviewVendorApplication } from '../src/services/vendor-onboarding.service';

const prisma = new PrismaClient();

describe('Vendor Role Update on Approval', () => {
  let testUserId: string;
  let testApplicationId: string;
  let adminUserId: string;

  beforeEach(async () => {
    // Create a test user with CUSTOMER role
    const testUser = await prisma.user.create({
      data: {
        email: 'test-vendor@example.com',
        password: 'hashedpassword',
        role: 'CUSTOMER',
      },
    });
    testUserId = testUser.id;

    // Create an admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: 'hashedpassword',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // Create a vendor application
    const application = await prisma.vendorApplication.create({
      data: {
        userId: testUserId,
        businessName: 'Test Business',
        businessType: 'INDIVIDUAL',
        businessDescription: 'Test business description',
        businessAddress: 'Test Address',
        businessPhone: '1234567890',
        bankName: 'Test Bank',
        bankAccountNumber: '1234567890',
        bankAccountName: 'Test Account',
        bankCode: 'TEST',
        expectedMonthlySales: 'UNDER_1000',
        status: 'PENDING',
      },
    });
    testApplicationId = application.id;

    // Create Ghana Card documents (required for approval)
    await prisma.vendorDocument.createMany({
      data: [
        {
          applicationId: testApplicationId,
          documentType: 'GHANA_CARD',
          side: 'FRONT',
          fileName: 'ghana-card-front.jpg',
          fileUrl: 'https://example.com/ghana-card-front.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
        },
        {
          applicationId: testApplicationId,
          documentType: 'GHANA_CARD',
          side: 'BACK',
          fileName: 'ghana-card-back.jpg',
          fileUrl: 'https://example.com/ghana-card-back.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
        },
      ],
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.vendorDocument.deleteMany({
      where: { applicationId: testApplicationId },
    });
    await prisma.vendorApplication.delete({
      where: { id: testApplicationId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.user.delete({
      where: { id: adminUserId },
    });
  });

  it('should update user role to VENDOR when application is approved', async () => {
    // Verify initial role is CUSTOMER
    const initialUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(initialUser?.role).toBe('CUSTOMER');

    // Approve the application
    await reviewVendorApplication(testApplicationId, adminUserId, {
      status: 'APPROVED',
      reviewNotes: 'Application approved for testing',
    });

    // Verify user role is now VENDOR
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(updatedUser?.role).toBe('VENDOR');

    // Verify application status is APPROVED
    const application = await prisma.vendorApplication.findUnique({
      where: { id: testApplicationId },
    });
    expect(application?.status).toBe('APPROVED');
  });

  it('should not update user role when application is rejected', async () => {
    // Verify initial role is CUSTOMER
    const initialUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(initialUser?.role).toBe('CUSTOMER');

    // Reject the application
    await reviewVendorApplication(testApplicationId, adminUserId, {
      status: 'REJECTED',
      reviewNotes: 'Application rejected for testing',
      rejectionReason: 'Test rejection reason',
    });

    // Verify user role remains CUSTOMER
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(updatedUser?.role).toBe('CUSTOMER');

    // Verify application status is REJECTED
    const application = await prisma.vendorApplication.findUnique({
      where: { id: testApplicationId },
    });
    expect(application?.status).toBe('REJECTED');
  });
});
