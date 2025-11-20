-- Comprehensive Marketplace Update Migration
-- This migration adds: OTP verification, Chat system, Escrow, Reviews, Wishlist, Inventory tracking

-- ============================================
-- 1. USER VERIFICATION UPDATES
-- ============================================
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- ============================================
-- 2. OTP VERIFICATION TABLE
-- ============================================
CREATE TYPE "OtpType" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION');

CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" "OtpType" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "recipient" TEXT NOT NULL, -- email or phone number
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OtpVerification_recipient_type_idx" ON "OtpVerification"("recipient", "type");
CREATE INDEX "OtpVerification_userId_idx" ON "OtpVerification"("userId");
CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

-- ============================================
-- 3. CHAT SYSTEM
-- ============================================
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLOCKED');

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT,
    "orderId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Conversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL,
    CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL
);

CREATE INDEX "Conversation_buyerId_idx" ON "Conversation"("buyerId");
CREATE INDEX "Conversation_sellerId_idx" ON "Conversation"("sellerId");
CREATE INDEX "Conversation_productId_idx" ON "Conversation"("productId");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");

-- ============================================
-- 4. ESCROW & DELIVERY SYSTEM
-- ============================================
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'AUTO_CONFIRMED');
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'REFUNDED');
CREATE TYPE "SettlementStatus" AS ENUM ('HELD', 'RELEASED', 'PENDING_RELEASE', 'CANCELLED');

ALTER TABLE "Order" ADD COLUMN "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN "deliveryConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveryConfirmedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Order" ADD COLUMN "disputeReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "disputeOpenedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "autoReleaseDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'HELD';

CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");
CREATE INDEX "Order_disputeStatus_idx" ON "Order"("disputeStatus");
CREATE INDEX "Order_settlementStatus_idx" ON "Order"("settlementStatus");
CREATE INDEX "Order_autoReleaseDate_idx" ON "Order"("autoReleaseDate");

-- Order Dispute Details Table
CREATE TABLE "OrderDispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "evidence" JSONB,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
    CONSTRAINT "OrderDispute_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "OrderDispute_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "OrderDispute_orderId_idx" ON "OrderDispute"("orderId");
CREATE INDEX "OrderDispute_status_idx" ON "OrderDispute"("status");
CREATE INDEX "OrderDispute_openedBy_idx" ON "OrderDispute"("openedBy");

-- ============================================
-- 5. VENDOR PAYOUT UPDATES FOR ESCROW
-- ============================================
ALTER TABLE "VendorPayout" ADD COLUMN "settlementDate" TIMESTAMP(3);
ALTER TABLE "VendorPayout" ADD COLUMN "autoReleased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VendorPayout" ADD COLUMN "escrowReleaseDate" TIMESTAMP(3);
ALTER TABLE "VendorPayout" ADD COLUMN "heldUntil" TIMESTAMP(3);

CREATE INDEX "VendorPayout_escrowReleaseDate_idx" ON "VendorPayout"("escrowReleaseDate");
CREATE INDEX "VendorPayout_status_heldUntil_idx" ON "VendorPayout"("status", "heldUntil");

-- ============================================
-- 6. PRODUCT REVIEWS & RATINGS
-- ============================================
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL, -- 1-5 stars
    "title" TEXT,
    "review" TEXT,
    "pros" TEXT[],
    "cons" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false, -- verified purchase
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "response" TEXT, -- vendor response
    "respondedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
    CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
    CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "ProductReview_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE UNIQUE INDEX "ProductReview_orderId_productId_userId_key" ON "ProductReview"("orderId", "productId", "userId");
CREATE INDEX "ProductReview_productId_rating_idx" ON "ProductReview"("productId", "rating");
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");
CREATE INDEX "ProductReview_createdAt_idx" ON "ProductReview"("createdAt");

-- Add review stats to Product
ALTER TABLE "Product" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ============================================
-- 7. WISHLIST
-- ============================================
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");
CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt");

-- ============================================
-- 8. INVENTORY MANAGEMENT
-- ============================================
ALTER TABLE "Product" ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Product" ADD COLUMN "allowBackorder" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_stock_lowStockThreshold_idx" ON "Product"("stock", "lowStockThreshold");

-- ============================================
-- 9. STORE UPDATES FOR GHANA CARD
-- ============================================
ALTER TABLE "Store" ADD COLUMN "ghanaCardFrontUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN "ghanaCardBackUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN "ghanaCardUploadedAt" TIMESTAMP(3);

-- ============================================
-- 10. UPDATE ORDER EVENTS FOR NEW STATUSES
-- ============================================
-- Add new order event types
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'ORDER_DELIVERED_CONFIRMED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'DISPUTE_RESOLVED';
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'FUNDS_RELEASED';
