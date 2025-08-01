# Paystack Implementation Setup Checklist

## 🎯 **What You Need to Complete the Paystack Implementation**

### **✅ Current Status:**

- ✅ Payment service implemented with subaccounts + splits
- ✅ Vendor payment service implemented
- ✅ Database schema updated
- ✅ API routes configured
- ✅ Environment variables configured

### **🔧 Required Setup Steps:**

## **1. Paystack Dashboard Configuration**

### **Get Your Platform Account Code:**

1. **Login to Paystack Dashboard** (https://dashboard.paystack.com)
2. **Go to Settings → API Keys & Webhooks**
3. **Copy your Account Code** (starts with `ACCT_`)
4. **Update `.docker.env`:**
   ```bash
   PAYSTACK_PLATFORM_ACCOUNT_CODE=ACCT_your_actual_account_code
   ```

### **Configure Webhooks:**

1. **In Paystack Dashboard → Settings → API Keys & Webhooks**
2. **Add Webhook URL:**
   ```
   https://yourdomain.com/api/payments/webhook
   ```
3. **Select Events:**
   - ✅ `charge.success`
   - ✅ `split.payment.completed`
   - ✅ `transfer.success`
   - ✅ `transfer.failed`
4. **Copy Webhook Secret** and update `.docker.env`:
   ```bash
   PAYSTACK_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

## **2. Environment Variables Setup**

### **Update `.docker.env` with Real Values:**

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key
PAYSTACK_PLATFORM_ACCOUNT_CODE=ACCT_your_platform_account_code
PAYSTACK_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (for callbacks)
FRONTEND_URL=http://localhost:3000  # or your production URL
```

### **For Production:**

```bash
# Production Paystack Keys
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_PLATFORM_ACCOUNT_CODE=ACCT_your_live_platform_account_code
PAYSTACK_WEBHOOK_SECRET=whsec_your_live_webhook_secret
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

## **3. Vendor Onboarding Process**

### **Step 1: Create Vendor User**

```bash
POST /auth/register
{
  "email": "vendor@example.com",
  "password": "password123",
  "role": "VENDOR"
}
```

### **Step 2: Create Store**

```bash
POST /vendor/stores
{
  "name": "Vendor Store",
  "description": "Store description"
}
```

### **Step 3: Create Paystack Subaccount**

```bash
POST /vendor/payment/account
{
  "vendorId": "vendor_user_id",
  "storeId": "store_id",
  "businessName": "Vendor Store",
  "accountNumber": "1234567890",
  "bankCode": "044",  # First Bank code
  "percentageCharge": 5  # Platform commission
}
```

## **4. Testing the Implementation**

### **Test Vendor Setup:**

```bash
# 1. Create test vendor
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testvendor@example.com",
    "password": "password123",
    "role": "VENDOR"
  }'

# 2. Create test store
curl -X POST http://localhost:4000/vendor/stores \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "description": "Test store for Paystack integration"
  }'

# 3. Create Paystack subaccount
curl -X POST http://localhost:4000/vendor/payment/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor_user_id",
    "storeId": "store_id",
    "businessName": "Test Store",
    "accountNumber": "1234567890",
    "bankCode": "044",
    "percentageCharge": 5
  }'
```

### **Test Payment Flow:**

```bash
# 1. Create order
curl -X POST http://localhost:4000/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "prod1", "quantity": 1}],
    "shippingAddress": {
      "street": "123 Test St",
      "city": "Accra",
      "state": "Greater Accra",
      "postalCode": "00233",
      "country": "Ghana"
    }
  }'

# 2. Initialize payment
curl -X POST http://localhost:4000/payments/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_id",
    "email": "customer@example.com",
    "amount": 10000
  }'
```

## **5. Webhook Testing**

### **Local Testing with ngrok:**

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start your API server
npm run dev

# 3. Expose local server
ngrok http 4000

# 4. Update Paystack webhook URL with ngrok URL
# https://abc123.ngrok.io/api/payments/webhook

# 5. Test webhook
curl -X POST https://abc123.ngrok.io/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: test_signature" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref",
      "status": "success",
      "amount": 10000
    }
  }'
```

## **6. Production Deployment**

### **Environment Variables:**

- [ ] Update all Paystack keys to live keys
- [ ] Set correct `FRONTEND_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Configure production webhook URL

### **Database:**

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify vendor subaccounts are created
- [ ] Test payment flow with real vendors

### **Monitoring:**

- [ ] Set up webhook monitoring
- [ ] Monitor split payment success rates
- [ ] Track vendor payout status

## **7. Common Issues & Solutions**

### **Issue: "Vendor does not have Paystack subaccount"**

**Solution:** Create subaccount for vendor using `/vendor/payment/account`

### **Issue: "Invalid subaccount code"**

**Solution:** Verify `PAYSTACK_PLATFORM_ACCOUNT_CODE` is correct

### **Issue: "Webhook signature verification failed"**

**Solution:** Check `PAYSTACK_WEBHOOK_SECRET` matches Paystack dashboard

### **Issue: "Split creation failed"**

**Solution:** Ensure all vendor subaccounts are active and valid

## **8. Next Steps**

1. **Get your Paystack account codes** from dashboard
2. **Update environment variables** with real values
3. **Test vendor onboarding** process
4. **Test payment flow** with test cards
5. **Configure webhooks** for production
6. **Deploy to production** with live keys

## **🎯 Ready to Go Live!**

Once you complete these steps, your Paystack multi-vendor marketplace will be fully functional with:

- ✅ Automatic payment splitting
- ✅ Vendor subaccounts
- ✅ Platform commission handling
- ✅ Webhook processing
- ✅ Multi-vendor order support

The implementation follows Paystack's official documentation and best practices! 🚀
