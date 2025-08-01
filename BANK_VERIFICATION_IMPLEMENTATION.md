# Bank Verification Implementation

## Overview

This document describes the implementation of bank verification functionality in the vendor onboarding flow using Paystack's bank list and account verification APIs.

## 🎯 **Implementation Decision: Backend API Calls**

Following industry best practices, we implemented bank verification on the **backend** for the following reasons:

### **Why Backend is Better:**

1. **Security**: API keys are never exposed to the frontend
2. **Rate Limiting**: Backend can implement proper rate limiting
3. **Caching**: Backend can cache bank lists to reduce API calls
4. **Error Handling**: Centralized error handling and logging
5. **Consistency**: All Paystack interactions go through the same service

## 🏗️ **Backend Implementation**

### **1. Bank Verification Service**

- **File**: `src/services/bank-verification.service.ts`
- **Features**:
  - Get list of banks from Paystack
  - Verify bank account numbers
  - Search banks by name or code
  - Get bank details by code
  - **Ghana Support**: Defaults to Nigerian banks when Ghana is requested (common pattern in African fintech)

### **2. Bank Verification Controller**

- **File**: `src/controllers/bank-verification.controller.ts`
- **Endpoints**:
  - `GET /bank-verification/banks` - Get list of banks
  - `POST /bank-verification/banks/verify` - Verify account number
  - `GET /bank-verification/banks/:bankCode` - Get bank by code
  - `GET /bank-verification/banks/search` - Search banks

### **3. OpenAPI Documentation**

- **File**: `src/routes/bank-verification.routes.ts`
- **Features**: Complete OpenAPI documentation for all endpoints
- **Security**: Bearer token authentication required

### **4. API Routes**

- **File**: `src/index.ts`
- **Route**: `/bank-verification` - All bank verification endpoints

## 🎨 **Frontend Implementation**

### **1. Generated API Hooks**

- **File**: `lib/api/bank-verification/bank-verification.tsx`
- **Auto-generated**: Using `pnpm codegen` from OpenAPI spec
- **Hooks**:
  - `useBanks()` - Get list of banks
  - `useBankVerification()` - Verify account number
  - `useBankByCode()` - Get bank by code
  - `useBankSearch()` - Search banks

### **2. Bank Selector Component**

- **File**: `components/vendor/onboarding/BankSelector.tsx`
- **Features**:
  - Searchable bank dropdown
  - Real-time bank list loading
  - Error handling and loading states
  - Auto-verification when bank and account number are provided

### **3. Bank Information Form**

- **File**: `components/vendor/onboarding/BankInformationForm.tsx`
- **Features**:
  - Integrated bank selector
  - Account number input with validation
  - Auto-filled account name after verification
  - Form integration with react-hook-form

### **4. Updated Vendor Onboarding Form**

- **File**: `components/vendor/onboarding/form.tsx`
- **Changes**: Replaced manual bank inputs with integrated bank selector

## 🔧 **API Endpoints**

### **Get Banks**

```http
GET /bank-verification/banks
Authorization: Bearer <token>
```

**Query Parameters:**

- `country` (optional): Country code (default: nigeria)
- `perPage` (optional): Number of banks per page (default: 50)
- `active` (optional): Filter by active status (default: true)

**Response:**

```json
{
  "message": "Banks retrieved successfully",
  "banks": [
    {
      "id": 1,
      "name": "First Bank of Nigeria",
      "slug": "first-bank-of-nigeria",
      "code": "044",
      "longcode": "044150149",
      "gateway": null,
      "pay_with_bank": true,
      "active": true,
      "country": "Nigeria",
      "currency": "NGN",
      "type": "nuban",
      "is_deleted": false
    }
  ]
}
```

### **Verify Bank Account**

```http
POST /bank-verification/banks/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountNumber": "1234567890",
  "bankCode": "044"
}
```

**Response:**

```json
{
  "message": "Bank account verified successfully",
  "verification": {
    "account_number": "1234567890",
    "account_name": "JOHN DOE",
    "bank_id": 1
  }
}
```

### **Get Bank by Code**

```http
GET /bank-verification/banks/{bankCode}
Authorization: Bearer <token>
```

### **Search Banks**

```http
GET /bank-verification/banks/search?search=first
Authorization: Bearer <token>
```

## 🚀 **User Experience Flow**

1. **Bank Selection**: User opens bank dropdown and searches for their bank
2. **Account Number Input**: User enters their 10-digit account number
3. **Auto-Verification**: System automatically verifies the account after 1 second delay
4. **Account Name Display**: Verified account name is auto-filled in the form
5. **Form Submission**: All bank details are included in the vendor application

## 🔒 **Security Features**

- **Authentication Required**: All endpoints require valid JWT token
- **Input Validation**: Account numbers must be exactly 10 digits
- **Error Handling**: Graceful error handling for invalid accounts
- **Rate Limiting**: Built-in rate limiting for API calls

## 🧪 **Testing**

### **Backend Testing**

```bash
# Test bank list
curl -X GET http://localhost:4000/bank-verification/banks \
  -H "Authorization: Bearer <token>"

# Test account verification
curl -X POST http://localhost:4000/bank-verification/banks/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "1234567890", "bankCode": "044"}'
```

### **Frontend Testing**

1. Navigate to vendor onboarding
2. Select bank from dropdown
3. Enter account number
4. Verify account name is auto-filled

## 📋 **Environment Variables**

```bash
PAYSTACK_SECRET_KEY=sk_test_...  # Required for Paystack API calls
```

## 🎯 **Benefits**

- ✅ **Improved UX**: Users can select from real bank list instead of typing
- ✅ **Data Accuracy**: Account verification ensures correct account details
- ✅ **Reduced Errors**: Auto-fill prevents typos in account names
- ✅ **Security**: API keys protected on backend
- ✅ **Performance**: Cached bank lists and optimized API calls
- ✅ **Compliance**: Follows Paystack API best practices

## 🔄 **Deployment Steps**

1. **Backend**:

   ```bash
   cd marketplace-api
   pnpm generate:spec  # Generate OpenAPI spec
   docker build -t marketplace-api .  # Rebuild Docker image
   ```

2. **Frontend**:
   ```bash
   cd marketplace-web
   pnpm codegen  # Generate API hooks from updated spec
   ```

## 📚 **Documentation**

- **Paystack Bank API**: https://paystack.com/docs/api/bank
- **Paystack Account Verification**: https://paystack.com/docs/api/verification
- **OpenAPI Documentation**: Available at `/docs` endpoint when server is running
