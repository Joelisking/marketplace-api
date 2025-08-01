# Ghana Card Upload Fix

## Problem

When users tried to upload Ghana Card images (front or back) during vendor onboarding, they received the following error:

```
{
    "message": "Internal server error - please try again later",
    "stack": "Error: Vendor application not found\n    at getBusinessDocuments (/usr/src/app/src/services/vendor-onboarding.service.ts:372:11)\n    at async <anonymous> (/usr/src/app/src/controllers/vendor-onboarding.controller.ts:90:21)"
}
```

## Root Cause

The issue was in the vendor onboarding flow. The frontend was trying to upload Ghana Card documents before a vendor application existed. The `getBusinessDocuments` and `uploadBusinessDocument` functions in the service expected an existing vendor application, but when users first started the onboarding process, no application existed yet.

## Solution

Modified the vendor onboarding service to handle the case where no application exists:

### 1. Updated `uploadBusinessDocument` function

- **File**: `src/services/vendor-onboarding.service.ts`
- **Change**: If no vendor application exists, automatically create a draft application with placeholder data
- **Benefit**: Users can now upload Ghana Card images first, then complete the rest of the application

### 2. Updated `getBusinessDocuments` function

- **File**: `src/services/vendor-onboarding.service.ts`
- **Change**: Return empty array instead of throwing error when no application exists
- **Benefit**: Frontend can safely check for existing documents without errors

### 3. Updated `submitVendorApplication` function

- **File**: `src/services/vendor-onboarding.service.ts`
- **Change**: Handle existing draft applications by updating them instead of creating new ones
- **Benefit**: Seamless transition from document upload to application completion

## Implementation Details

### Draft Application Creation

When a user uploads their first Ghana Card document, a draft application is created with:

- Status: `PENDING`
- Business Name: "Draft Application"
- Placeholder values for required fields
- Proper association with uploaded documents

### Application Completion

When the user submits the full application:

- If a draft exists, it's updated with the real data
- If no draft exists, a new application is created
- All uploaded documents remain associated with the application

## Testing

The fix was tested with a comprehensive test script that verified:

1. ✅ Login functionality
2. ✅ Getting documents (returns empty array when no application exists)
3. ✅ Uploading Ghana Card front side (creates draft application)
4. ✅ Uploading Ghana Card back side (associates with existing application)
5. ✅ Duplicate prevention (prevents uploading same side twice)
6. ✅ Document retrieval after upload (returns all uploaded documents)

## Files Modified

- `src/services/vendor-onboarding.service.ts` - Main service logic updates
- `GHANA_CARD_UPLOAD_FIX.md` - This documentation

## Impact

- ✅ Users can now upload Ghana Card images at any point during onboarding
- ✅ No more "Vendor application not found" errors
- ✅ Seamless flow from document upload to application completion
- ✅ Maintains data integrity and prevents duplicates
- ✅ Backward compatible with existing applications
