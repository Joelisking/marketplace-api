/*
  Warnings:

  - Added the required column `ghanaCardBack` to the `VendorApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ghanaCardFront` to the `VendorApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "ghanaCardBack" TEXT NOT NULL,
ADD COLUMN     "ghanaCardFront" TEXT NOT NULL;
