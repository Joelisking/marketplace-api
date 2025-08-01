-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paystackAccountActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paystackAccountCode" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- CreateIndex
CREATE INDEX "Store_vendorId_idx" ON "Store"("vendorId");

-- CreateIndex
CREATE INDEX "Store_paystackAccountCode_idx" ON "Store"("paystackAccountCode");
