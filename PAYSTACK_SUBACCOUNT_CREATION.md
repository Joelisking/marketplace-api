# Paystack Sub-Account Creation for Vendors

## Overview

This feature automatically creates Paystack sub-accounts for vendors when they complete their onboarding process. This ensures that vendors can start receiving payments immediately after approval.

## How It Works

### 1. Automatic Creation During Onboarding

When a vendor application is approved, the system automatically:

1. Creates a store for the vendor
2. Creates a Paystack sub-account using the bank information from their application
3. Links the sub-account to their store

### 2. Manual Creation (Fallback)

If automatic creation fails, vendors can manually create their Paystack sub-account using their application data through the vendor dashboard.

## Implementation Details

### Backend Changes

#### Vendor Onboarding Service (`vendor-onboarding.service.ts`)

- Modified `createVendorStore()` function to accept bank information
- Updated approval logic to pass bank details when creating stores
- Integrated Paystack sub-account creation into the store creation process

#### Vendor Controller (`vendor.controller.ts`)

- Updated `getVendorStore()` to include `paystackAccountCode` and `paystackAccountActive` fields
- This allows the frontend to check if a vendor has a Paystack account

#### Vendor Routes (`vendor.routes.ts`)

- Added new endpoint: `POST /vendor/payment/account/from-application`
- Allows vendors to manually create Paystack sub-account using their application data
- Includes proper OpenAPI documentation

### Frontend Changes

#### PaystackAccountSetup Component

- New component that shows Paystack account status
- Allows vendors to create sub-account if not already created
- Shows account code when account is active
- Integrated into vendor dashboard

#### Vendor Dashboard

- Added PaystackAccountSetup component to the overview tab
- Shows account status and creation options

## API Endpoints

### Create Paystack Sub-Account from Application

```
POST /vendor/payment/account/from-application
```

**Request Body:** Empty object (uses application data)

**Response:**

```json
{
  "success": true,
  "message": "Paystack sub-account created successfully using application data",
  "account": {
    "accountCode": "ACCT_xxx",
    "accountId": "123",
    "status": "active"
  }
}
```

**Error Responses:**

- `400`: Application not approved or account already exists
- `404`: Vendor application or store not found
- `401`: Unauthorized

## Database Schema

The `Store` model includes these Paystack-related fields:

```prisma
model Store {
  // ... other fields
  paystackAccountCode String?
  paystackAccountActive Boolean @default(false)
}
```

## Configuration

### Environment Variables

Ensure these are set in your environment:

```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_BASE_URL=https://api.paystack.co
```

### Default Settings

- **Platform Fee**: 5% (configurable per sub-account)
- **Settlement**: T+1 business days
- **Currency**: GHS (Ghana Cedi)

## Error Handling

### Automatic Creation Failures

If Paystack sub-account creation fails during onboarding:

1. Store creation continues (doesn't fail the onboarding)
2. Error is logged for debugging
3. Vendor can manually create account later
4. Notification sent to vendor about the issue

### Manual Creation Failures

- Clear error messages displayed to vendor
- Retry mechanism available
- Support contact information provided

## Testing

### Test Scenarios

1. **Successful Automatic Creation**
   - Submit vendor application with valid bank details
   - Approve application
   - Verify Paystack sub-account is created

2. **Manual Creation**
   - Vendor without Paystack account visits dashboard
   - Clicks "Create Paystack Account"
   - Verifies account is created successfully

3. **Error Handling**
   - Test with invalid bank details
   - Test with network failures
   - Verify graceful error handling

### Test Data

Use these test bank details for Paystack testing:

```json
{
  "bankCode": "044",
  "accountNumber": "1234567890",
  "accountName": "Test Account"
}
```

## Security Considerations

1. **Bank Information**: Only used for Paystack sub-account creation
2. **Access Control**: Only vendors can create accounts for themselves
3. **Validation**: Bank details validated before sub-account creation
4. **Audit Trail**: All sub-account creations are logged

## Monitoring

### Key Metrics to Track

1. **Success Rate**: Percentage of successful sub-account creations
2. **Failure Reasons**: Common causes of creation failures
3. **Manual Creation Usage**: How often vendors use manual creation
4. **Time to Creation**: Average time from approval to account creation

### Logs to Monitor

- Paystack API responses
- Sub-account creation attempts
- Error messages and stack traces
- Vendor notification delivery

## Future Enhancements

1. **Bulk Creation**: Admin interface to create accounts for multiple vendors
2. **Account Management**: Allow vendors to update bank details
3. **Settlement Reports**: Detailed payout reports
4. **Webhook Integration**: Real-time settlement notifications
5. **Multi-Currency Support**: Support for other currencies

## Support

For issues related to Paystack sub-account creation:

1. Check Paystack dashboard for account status
2. Verify bank details are correct
3. Check environment variables are set
4. Review application logs for errors
5. Contact Paystack support if needed
