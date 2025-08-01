# Vendor Onboarding Documents Update

## 🎯 **Overview**

This document explains the backend changes made to fix the design inconsistency in Ghana Card handling and provides guidance for frontend implementation.

## 🔧 **Backend Changes Made**

### **1. Schema Updates**

#### **Prisma Schema (`prisma/schema.prisma`)**

- ✅ Removed `ghanaCardFront: String` field from `VendorApplication` model
- ✅ Removed `ghanaCardBack: String` field from `VendorApplication` model
- ✅ Kept `ghanaCardNumber: String?` field (still required for application)

#### **Zod Schema (`src/schema/vendor-onboarding.ts`)**

- ✅ Removed `ghanaCardFront: z.string()` from `VendorApplicationSchema`
- ✅ Removed `ghanaCardBack: z.string()` from `VendorApplicationSchema`
- ✅ Updated `VendorApplicationResponse` to include `side` field in documents

#### **Service Layer (`src/services/vendor-onboarding.service.ts`)**

- ✅ Removed Ghana Card front/back validation from `submitVendorApplication`
- ✅ Removed Ghana Card fields from application creation data
- ✅ Kept Ghana Card number validation

#### **OpenAPI Registration (`src/routes/vendor-onboarding.routes.ts`)**

- ✅ Removed Ghana Card front/back fields from request schema
- ✅ Updated required fields list

### **2. Database Changes**

- ✅ Applied schema changes to both local and Docker databases
- ✅ Removed existing Ghana Card URL columns (data was preserved in documents)

## 🎨 **Frontend Implementation Guide**

### **Recommended Approach: Use Documents Endpoint**

The frontend should now use the documents endpoint for Ghana Card uploads instead of including them in the application submission.

#### **Step 1: Upload Ghana Card Images**

```typescript
// Upload Ghana Card images first
const uploadGhanaCardImage = async (file: File, side: 'FRONT' | 'BACK') => {
  // 1. Get presigned URL for upload
  const presignedUrl = await getPresignedUploadUrl(file.name, file.type);

  // 2. Upload file to storage
  await uploadToStorage(presignedUrl, file);

  // 3. Create document record
  const documentData = {
    documentType: 'GHANA_CARD',
    side: side,
    fileName: file.name,
    fileUrl: presignedUrl.split('?')[0], // Remove query params
    fileSize: file.size,
    mimeType: file.type,
  };

  const response = await fetch('/vendor-onboarding/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(documentData),
  });

  return response.json();
};

// Upload both sides
const frontUpload = await uploadGhanaCardImage(frontFile, 'FRONT');
const backUpload = await uploadGhanaCardImage(backFile, 'BACK');
```

#### **Step 2: Submit Application**

```typescript
// Submit application without Ghana Card URLs
const applicationData = {
  businessName: formData.businessName,
  businessType: formData.businessType,
  businessDescription: formData.businessDescription,
  businessAddress: formData.businessAddress,
  businessPhone: formData.businessPhone,
  taxIdentification: formData.taxIdentification,
  ghanaCardNumber: formData.ghanaCardNumber, // Still required
  bankName: formData.bankName,
  bankAccountNumber: formData.bankAccountNumber,
  bankAccountName: formData.bankAccountName,
  bankCode: formData.bankCode,
  expectedMonthlySales: formData.expectedMonthlySales,
  productCategories: formData.productCategories,
  socialMediaLinks: formData.socialMediaLinks,
  // No ghanaCardFront or ghanaCardBack fields
};

const response = await fetch('/vendor-onboarding/application', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(applicationData),
});
```

### **Alternative Approach: Upload URLs in Application**

If you prefer to upload images first and include URLs in the application:

```typescript
const submitVendorApplication = async (formData: VendorApplicationForm) => {
  try {
    // 1. Upload Ghana Card images and get URLs
    const frontUrl = await uploadImageAndGetUrl(formData.ghanaCardFrontFile);
    const backUrl = await uploadImageAndGetUrl(formData.ghanaCardBackFile);

    // 2. Create document records for the uploaded images
    await createGhanaCardDocument(frontUrl, formData.ghanaCardFrontFile, 'FRONT');
    await createGhanaCardDocument(backUrl, formData.ghanaCardBackFile, 'BACK');

    // 3. Submit application (without Ghana Card URLs)
    const applicationData = {
      ...formData,
      // Remove file objects
      ghanaCardFrontFile: undefined,
      ghanaCardBackFile: undefined,
    };

    return fetch('/vendor-onboarding/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData),
    });
  } catch (error) {
    console.error('Application submission failed:', error);
    throw error;
  }
};

const createGhanaCardDocument = async (url: string, file: File, side: 'FRONT' | 'BACK') => {
  const documentData = {
    documentType: 'GHANA_CARD',
    side: side,
    fileName: file.name,
    fileUrl: url,
    fileSize: file.size,
    mimeType: file.type,
  };

  return fetch('/vendor-onboarding/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(documentData),
  });
};
```

## 📋 **Updated API Endpoints**

### **Application Endpoint**

```bash
POST /vendor-onboarding/application
```

**Request Body (Updated):**

```json
{
  "businessName": "My Business",
  "businessType": "LIMITED_LIABILITY_COMPANY",
  "businessDescription": "Business description",
  "businessAddress": "123 Business St, Accra",
  "businessPhone": "+233244123456",
  "taxIdentification": "GHA123456789",
  "ghanaCardNumber": "GHA-123456789-X",
  "bankName": "GCB Bank",
  "bankAccountNumber": "0123456047",
  "bankAccountName": "My Business Ltd",
  "bankCode": "058",
  "expectedMonthlySales": "TEN_TO_FIFTY_THOUSAND",
  "productCategories": ["Electronics", "Computers"],
  "socialMediaLinks": {
    "facebook": "https://facebook.com/mybusiness",
    "instagram": "https://instagram.com/mybusiness"
  }
}
```

**Removed Fields:**

- `ghanaCardFront` (now handled via documents endpoint)
- `ghanaCardBack` (now handled via documents endpoint)

### **Documents Endpoint**

```bash
POST /vendor-onboarding/documents
```

**Request Body:**

```json
{
  "documentType": "GHANA_CARD",
  "side": "FRONT",
  "fileName": "ghana_card_front.jpg",
  "fileUrl": "https://storage.example.com/ghana_card_front.jpg",
  "fileSize": 2048576,
  "mimeType": "image/jpeg"
}
```

## 🔍 **Validation & Requirements**

### **Application Requirements**

- ✅ Ghana Card number is still required
- ✅ All business details are required
- ✅ Bank information is required

### **Document Requirements**

- ✅ Both front and back Ghana Card images must be uploaded
- ✅ Images must be uploaded before application approval
- ✅ Duplicate uploads of the same side are prevented

### **Approval Process**

The system automatically validates that both Ghana Card sides are uploaded before allowing approval:

```typescript
// In reviewVendorApplication service
if (status === 'APPROVED') {
  const ghanaCardFront = application.businessDocuments.find(
    (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'FRONT',
  );
  const ghanaCardBack = application.businessDocuments.find(
    (doc) => doc.documentType === 'GHANA_CARD' && doc.side === 'BACK',
  );

  if (!ghanaCardFront || !ghanaCardBack) {
    throw new Error(
      'Both front and back images of the Ghana Card must be uploaded before approval',
    );
  }
}
```

## 🎯 **Benefits of This Approach**

1. **Cleaner Separation**: Application data and documents are properly separated
2. **Better Document Management**: Documents can be verified, updated, and managed independently
3. **Flexible Upload Flow**: Frontend can choose when and how to upload documents
4. **Consistent API Design**: All documents follow the same upload pattern
5. **Future Extensibility**: Easy to add more document types later

## 🚀 **Migration Notes**

- Existing applications with Ghana Card URLs in the database will continue to work
- The system will check for Ghana Card documents during approval
- New applications must use the documents endpoint for Ghana Card uploads
- No breaking changes to existing functionality

## 📝 **Example Frontend Flow**

```typescript
// Complete vendor onboarding flow
const completeVendorOnboarding = async (formData: VendorApplicationForm) => {
  try {
    // Step 1: Upload Ghana Card images
    await uploadGhanaCardImage(formData.ghanaCardFrontFile, 'FRONT');
    await uploadGhanaCardImage(formData.ghanaCardBackFile, 'BACK');

    // Step 2: Submit application
    const application = await submitVendorApplication(formData);

    // Step 3: Show success message
    showSuccessMessage('Vendor application submitted successfully!');

    return application;
  } catch (error) {
    showErrorMessage('Failed to submit application: ' + error.message);
    throw error;
  }
};
```

This approach provides a clean, maintainable, and extensible solution for vendor onboarding! 🎉
