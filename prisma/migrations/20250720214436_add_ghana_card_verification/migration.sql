-- AlterEnum
ALTER TYPE "VendorDocumentType" ADD VALUE 'GHANA_CARD';

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "ghanaCardNumber" TEXT;
