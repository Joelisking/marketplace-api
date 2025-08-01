# Paystack Simplified Setup Guide

## 🎯 **What You Actually Need (Based on Paystack Dashboard)**

Looking at your Paystack dashboard, here's what you have and what you need:

### **✅ Available in Dashboard:**

- ✅ **Live Secret Key** (masked, but you can reveal it)
- ✅ **Live Public Key** (visible: `pk_live_4afc584ccb1e805121952352ab69682679d4062b`)
- ✅ **Live Callback URL** (for redirects)
- ✅ **Live Webhook URL** (for webhooks)

### **❌ Not Available in API Configuration:**

- ❌ **Account Code** (for marketplace share)
- ❌ **Webhook Secret** (for signature verification)

## 🔧 **Simplified Implementation**

### **1. Update Your Environment Variables**

**In `.docker.env`:**

```bash
# Paystack Configuration (from your dashboard)
PAYSTACK_SECRET_KEY=sk_live_your_actual_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_4afc584ccb1e805121952352ab69682679d4062b
FRONTEND_URL=http://localhost:3000

# For Production:
# FRONTEND_URL=https://yourdomain.com
```

### **2. How Commission Works Now**

Since we can't get the platform account code, the commission is handled differently:

**✅ Current Approach:**

- Each vendor subaccount has `percentage_charge: 5`
- Paystack automatically deducts 5% from each vendor's payment
- The 5% goes to your main Paystack account
- Vendors receive 95% of their sales

**Example:**

```
Customer pays: 100 GHS
Vendor receives: 95 GHS (95% after 5% commission)
Platform gets: 5 GHS (automatically deducted by Paystack)
```

### **3. Webhook Setup**

**In Paystack Dashboard:**

1. Set **Live Webhook URL** to: `https://yourdomain.com/api/payments/webhook`
2. Select these events:
   - ✅ `charge.success`
   - ✅ `split.payment.completed`
   - ✅ `transfer.success`
   - ✅ `transfer.failed`

**Note:** Webhook signature verification is temporarily disabled since the webhook secret isn't available.

### **4. Testing the Implementation**

#### **Step 1: Create Test Vendor**

```bash
# Create vendor user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testvendor@example.com",
    "password": "password123",
    "role": "VENDOR"
  }'
```

#### **Step 2: Create Store**

```bash
# Create store for vendor
curl -X POST http://localhost:4000/vendor/stores \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "description": "Test store for Paystack integration"
  }'
```

#### **Step 3: Create Paystack Subaccount**

```bash
# Create Paystack subaccount for vendor
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

#### **Step 4: Test Payment**

```bash
# Create order
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

# Initialize payment
curl -X POST http://localhost:4000/payments/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_id",
    "email": "customer@example.com",
    "amount": 10000
  }'
```

## 🚀 **What You Need to Do Right Now**

### **1. Get Your Secret Key**

- In Paystack Dashboard → API Configuration
- Click the eye icon next to "Live Secret Key"
- Copy the revealed secret key
- Update `.docker.env` with the real secret key

### **2. Set Webhook URL**

- In Paystack Dashboard → API Configuration
- Set **Live Webhook URL** to your server's webhook endpoint
- For local testing: Use ngrok URL
- For production: Use your domain

### **3. Test with Real Keys**

- Replace test keys with live keys in `.docker.env`
- Test the vendor onboarding process
- Test a payment flow

## ⚠️ **Important Notes**

### **Commission Handling:**

- ✅ **Automatic**: Paystack handles commission via `percentage_charge`
- ✅ **No manual transfers**: No need for Transfer API
- ✅ **Real-time**: Commission deducted immediately

### **Security:**

- ⚠️ **Webhook verification**: Temporarily disabled
- ⚠️ **Signature verification**: Will be enabled when webhook secret is available

### **Limitations:**

- ❌ **No marketplace share in splits**: Commission handled via percentage_charge
- ❌ **No webhook signature verification**: Until webhook secret is available

## 🎯 **Ready to Test!**

Your implementation is now simplified and ready to work with what's available in your Paystack dashboard:

1. **Update secret key** in `.docker.env`
2. **Set webhook URL** in Paystack dashboard
3. **Test vendor onboarding**
4. **Test payment flow**

The commission will be handled automatically by Paystack's `percentage_charge` feature! 🚀
