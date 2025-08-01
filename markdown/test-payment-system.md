# Multi-Vendor Payment System Testing Guide

## Prerequisites

### 1. Environment Variables

```bash
# .env file
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_MARKETPLACE_ACCOUNT_CODE=ACCT_xxxxxxxxxxxxx
NODE_ENV=development
```

### 2. Paystack Dashboard Setup

- [ ] Get API keys from Settings → API Keys
- [ ] Configure webhook URL: `https://your-ngrok-url.ngrok-free.app/payments/webhook`
- [ ] Select webhook events: `charge.success`, `charge.failed`, `refund.processed`

## Testing Steps

### Step 1: Create Test Vendors and Stores

```bash
# Create a vendor user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor1@test.com",
    "password": "password123",
    "role": "VENDOR",
    "firstName": "Test",
    "lastName": "Vendor"
  }'

# Create a store for the vendor
curl -X POST http://localhost:4000/vendor/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VENDOR_JWT_TOKEN" \
  -d '{
    "name": "Test Store",
    "description": "A test store for payment testing"
  }'
```

### Step 2: Set Up Vendor Paystack Account

```bash
# Create Paystack subaccount for vendor
curl -X POST http://localhost:4000/vendor/payment/account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VENDOR_JWT_TOKEN" \
  -d '{
    "vendorId": "vendor_user_id",
    "storeId": "store_id",
    "businessName": "Test Store",
    "accountNumber": "1234567890",
    "bankCode": "044", // First Bank code
    "percentageCharge": 0
  }'
```

### Step 3: Create Test Products

```bash
# Add products to the store
curl -X POST http://localhost:4000/vendor/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VENDOR_JWT_TOKEN" \
  -d '{
    "name": "Test Product",
    "price": 5000,
    "stock": 10,
    "description": "A test product for payment testing"
  }'
```

### Step 4: Create Test Order

```bash
# Create an order with the product
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_JWT_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "product_id",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "street": "123 Test St",
      "city": "Accra",
      "state": "Greater Accra",
      "postalCode": "00233",
      "country": "Ghana"
    }
  }'
```

### Step 5: Initialize Payment

```bash
# Initialize payment with split
curl -X POST http://localhost:4000/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_JWT_TOKEN" \
  -d '{
    "orderId": "order_id",
    "email": "customer@test.com",
    "amount": 10000
  }'
```

### Step 6: Test Payment with Paystack Test Cards

Use these test cards in the Paystack checkout:

**Successful Payment:**

- Card Number: `4084 0840 8408 4081`
- Expiry: Any future date
- CVV: Any 3 digits
- PIN: Any 4 digits

**Failed Payment:**

- Card Number: `4084 0840 8408 4082`
- Expiry: Any future date
- CVV: Any 3 digits
- PIN: Any 4 digits

### Step 7: Verify Payment

```bash
# Verify payment status
curl -X POST http://localhost:4000/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_JWT_TOKEN" \
  -d '{
    "reference": "ORDER_order_id_timestamp"
  }'
```

### Step 8: Check Vendor Settlement

```bash
# Check vendor settlements
curl -X GET "http://localhost:4000/vendor/payment/settlements/ACCT_vendor_account_code" \
  -H "Authorization: Bearer VENDOR_JWT_TOKEN"
```

## Expected Results

### ✅ Successful Payment Flow:

1. **Payment Initialization**: Returns authorization URL
2. **Payment Processing**: Paystack splits payment automatically
3. **Webhook Processing**: Updates order and payment status
4. **Vendor Settlement**: Vendor receives their portion (95% of their items)
5. **Marketplace Commission**: Marketplace receives 5% commission

### ✅ Database Updates:

- Order status: `UNPAID` → `PENDING` → `PAID` → `PROCESSING`
- Payment status: `PENDING` → `PAID`
- Order events created for audit trail

### ✅ Paystack Dashboard:

- Transaction shows split payment details
- Vendor subaccount receives settlement
- Marketplace account receives commission

## Troubleshooting

### Common Issues:

1. **Webhook Not Received**
   - Check ngrok URL is accessible
   - Verify webhook URL in Paystack dashboard
   - Check server logs for errors

2. **Payment Split Failed**
   - Verify vendor has active Paystack subaccount
   - Check vendor account codes are correct
   - Ensure marketplace account code is valid

3. **Database Errors**
   - Run `npx prisma generate` after schema changes
   - Check database connection
   - Verify all required fields are present

## Production Checklist

- [ ] Switch to live Paystack keys
- [ ] Update webhook URL to production domain
- [ ] Set `NODE_ENV=production`
- [ ] Enable webhook signature verification
- [ ] Test with real bank accounts
- [ ] Monitor payment success rates
- [ ] Set up error alerting
