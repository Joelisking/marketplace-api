-- Fix vendors without stores by creating stores for them
-- This migration ensures all vendors have stores

-- Create stores for any vendors who don't have one
INSERT INTO "Store" (
  id,
  name,
  slug,
  description,
  "vendorId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  COALESCE(va."businessName", 'Vendor Store'),
  COALESCE(
    LOWER(REGEXP_REPLACE(va."businessName", '[^a-zA-Z0-9]', '-', 'g')),
    'vendor-store'
  ),
  COALESCE(va."businessDescription", 'Vendor store'),
  u.id,
  true,
  NOW(),
  NOW()
FROM "User" u
LEFT JOIN "Store" s ON u.id = s."vendorId"
LEFT JOIN "VendorApplication" va ON u.id = va."userId"
WHERE u.role = 'VENDOR' 
  AND s.id IS NULL
  AND va.id IS NOT NULL;

-- Create default stores for vendors without applications (edge case)
INSERT INTO "Store" (
  id,
  name,
  slug,
  description,
  "vendorId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  'Vendor Store',
  'vendor-store-' || SUBSTRING(u.id FROM 1 FOR 8),
  'Default vendor store',
  u.id,
  true,
  NOW(),
  NOW()
FROM "User" u
LEFT JOIN "Store" s ON u.id = s."vendorId"
LEFT JOIN "VendorApplication" va ON u.id = va."userId"
WHERE u.role = 'VENDOR' 
  AND s.id IS NULL
  AND va.id IS NULL; 