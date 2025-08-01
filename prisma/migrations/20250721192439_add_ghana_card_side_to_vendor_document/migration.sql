-- CreateEnum
CREATE TYPE "GhanaCardSide" AS ENUM ('FRONT', 'BACK');

-- AlterTable
ALTER TABLE "VendorDocument" ADD COLUMN     "side" "GhanaCardSide";

-- CreateIndex
CREATE INDEX "VendorDocument_side_idx" ON "VendorDocument"("side");
