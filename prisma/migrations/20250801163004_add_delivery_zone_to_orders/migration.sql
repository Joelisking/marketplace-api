/*
  Warnings:

  - You are about to drop the column `businessEmail` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `businessLicense` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `businessWebsite` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `ghanaCardBack` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `ghanaCardFront` on the `VendorApplication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryZone" TEXT;

-- AlterTable
ALTER TABLE "VendorApplication" DROP COLUMN "businessEmail",
DROP COLUMN "businessLicense",
DROP COLUMN "businessWebsite",
DROP COLUMN "ghanaCardBack",
DROP COLUMN "ghanaCardFront";
