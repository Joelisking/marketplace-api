# Paystack Vendor Disbursement Implementation

## Overview

This document explains the implementation of vendor disbursement using Paystack's split payment system for the Ghanaian marketplace. The system automatically handles vendor payouts when customers make payments.

## Architecture

### 1. Paystack Split Payment System

The implementation uses Paystack's split payment feature which allows:

- Automatic splitting of payments between vendors and platform
- Direct transfer to vendor subaccounts
- Platform fee collection
- Automatic settlement to vendor bank accounts

### 2. Database Schema

#### VendorPayout Model

```prisma
model VendorPayout {
  id                  String       @id @default(cuid())
  vendorId            String
  storeId             String
  orderId             String
  amount              Int          // Amount to vendor (after platform fee)
  platformFee         Int          // Platform fee amount
  totalAmount         Int          // Total before platform fee
  status              PayoutStatus
  paystackAccountCode String       // Paystack subaccount code
  metadata            Json?        // Additional payout info
  processedAt         DateTime?    // When payout was processed
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  // Relations
  vendor User  @relation("VendorPayouts", fields: [vendorId], references: [id])
  store  Store @relation("StorePayouts", fields: [storeId], references: [id])
  order  Order @relation("OrderPayouts", fields: [orderId], references: [id])
}
```

#### PayoutStatus Enum

```prisma
enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

## Implementation Details

### 1. Vendor Subaccount Creation

**Service**: `src/services/vendor-payment.service.ts`
**Function**: `createVendorPaystackAccount()`

Creates a Paystack subaccount for each vendor store:

- Links vendor's bank account
- Sets platform commission percentage
- Stores subaccount code in database

### 2. Payment Processing Flow

**Service**: `src/services/payment.service.ts`

1. **Payment Initialization**:
   - Calculate vendor splits based on order items
   - Create Paystack split configuration
   - Initialize payment with split code

2. **Payment Verification**:
   - Verify payment with Paystack
   - Update order and payment status
   - Trigger vendor payout processing

3. **Vendor Payout Processing**:
   - Group order items by vendor
   - Calculate platform fees (5% default)
   - Create payout records in database
   - Funds automatically transferred via Paystack split

### 3. Vendor Payout Functions

**Service**: `src/services/vendor-payment.service.ts`

#### `processVendorPayouts(orderId: string)`

- Processes payouts for all vendors in an order
- Groups items by vendor/store
- Calculates platform fees
- Creates payout records
- Triggers Paystack settlement

#### `getVendorEarnings(vendorId: string, startDate?, endDate?)`

- Returns vendor earnings summary
- Total earnings, payouts, pending amounts
- Platform fees breakdown

#### `getVendorPayoutHistory(vendorId: string, page, perPage)`

- Returns paginated payout history
- Includes order details and payment references

### 4. API Endpoints

**Routes**: `src/routes/vendor-payment.routes.ts`

#### Vendor Account Management

- `POST /vendor/payment/account` - Create Paystack subaccount
- `PUT /vendor/payment/account/:accountCode` - Update subaccount
- `GET /vendor/payment/account/:accountCode` - Get account details

#### Payout Processing

- `POST /vendor/payment/payouts/process/:orderId` - Process payouts (Admin)
- `GET /vendor/payment/earnings` - Get earnings summary
- `GET /vendor/payment/payouts/history` - Get payout history

#### Settlements

- `GET /vendor/payment/settlements/:accountCode` - Get settlement history

## Configuration

### Environment Variables

```env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PLATFORM_SUBACCOUNT_CODE=ACCT_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
```

### Platform Settings

- **Platform Fee**: 5% (configurable per vendor)
- **Currency**: GHS (Ghanaian Cedi)
- **Settlement**: Automatic via Paystack

## Payment Flow Example

1. **Customer places order** with items from multiple vendors
2. **Payment initialization**:
   ```javascript
   // Calculate splits
   const splits = [
     { subaccountCode: 'ACCT_vendor1', share: 60 },
     { subaccountCode: 'ACCT_vendor2', share: 25 },
     { subaccountCode: 'ACCT_platform', share: 15 },
   ];
   ```
3. **Customer pays** via Paystack
4. **Payment verification** triggers webhook
5. **Vendor payouts processed** automatically
6. **Funds transferred** to vendor subaccounts
7. **Vendors can withdraw** to their bank accounts

## Error Handling

### Webhook Failures

- Payout processing failures don't affect payment verification
- Failed payouts are logged and can be retried
- Manual payout processing available for admins

### Subaccount Issues

- Validation of vendor bank account details
- Verification of Paystack subaccount status
- Fallback handling for inactive accounts

## Security Considerations

1. **Webhook Verification**: Paystack signature verification in production
2. **Admin Access**: Payout processing restricted to admin users
3. **Vendor Isolation**: Vendors can only access their own data
4. **Audit Trail**: All payout activities logged in database

## Monitoring and Analytics

### Key Metrics

- Total vendor payouts processed
- Platform fee revenue
- Payout success/failure rates
- Vendor earnings trends

### Logging

- All payout processing activities logged
- Error tracking for failed payouts
- Performance monitoring for large orders

## Testing

### Test Scenarios

1. Single vendor order payout
2. Multi-vendor order payout
3. Platform fee calculation accuracy
4. Webhook processing reliability
5. Error handling and recovery

### Test Data

- Use Paystack test keys for development
- Mock webhook events for testing
- Sample vendor subaccounts for testing

## Future Enhancements

1. **Dynamic Platform Fees**: Configurable per vendor/category
2. **Scheduled Payouts**: Batch processing for efficiency
3. **Payout Notifications**: Email/SMS alerts to vendors
4. **Advanced Analytics**: Detailed vendor performance metrics
5. **Multi-Currency Support**: Support for other currencies

## Troubleshooting

### Common Issues

1. **Subaccount not found**: Verify vendor account setup
2. **Split calculation errors**: Check order item grouping
3. **Webhook failures**: Verify signature and payload format
4. **Database errors**: Check Prisma schema and migrations

### Debug Commands

```bash
# Check Prisma schema
pnpm prisma format
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Test database connection
pnpm prisma db push
```

## Conclusion

This implementation provides a robust, automated vendor disbursement system using Paystack's split payment feature. It ensures vendors receive their payments automatically while maintaining proper audit trails and error handling.
