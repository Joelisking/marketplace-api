# Paystack Marketplace Implementation Guide

## 🚨 **Corrected Implementation**

You were absolutely right to question the previous approach. Here's the **correct** way to implement a multi-vendor marketplace with Paystack:

## 📋 **How Paystack Marketplaces Actually Work**

### **❌ What I Got Wrong:**

- Subaccounts are NOT for individual vendors
- Split payments don't work for multi-vendor orders
- Automatic vendor onboarding doesn't exist

### **✅ Correct Approach:**

1. **Marketplace collects full payment** to their main account
2. **Vendors must be manually onboarded** by Paystack
3. **Marketplace uses Transfer API** to send money to vendors
4. **Each vendor has their own Paystack account** (not subaccount)

## 🔧 **Implementation Steps**

### **Step 1: Vendor Onboarding Process**

**Manual Process (Required by Paystack):**

1. Vendor applies to Paystack directly
2. Paystack verifies vendor's business
3. Paystack approves and creates vendor account
4. Vendor gets their own Paystack account code
5. Marketplace stores vendor's account code

**Vendor Application Flow:**

```
Vendor → Applies to Paystack → Paystack Verifies → Vendor Gets Account Code → Marketplace Stores Code
```

### **Step 2: Payment Flow**

```
Customer Payment → Marketplace Account → Transfer to Vendors → Vendors Receive Money
```

1. **Customer pays** full amount to marketplace
2. **Marketplace keeps** commission (5%)
3. **Marketplace transfers** remaining amount to vendors
4. **Vendors receive** money in their Paystack accounts

### **Step 3: Technical Implementation**

#### **Payment Collection:**

```typescript
// Collect full payment to marketplace account
const paystackData = {
  email,
  amount: amount * 100,
  reference,
  currency: 'GHS',
  // NO split payment - collect everything to marketplace
};
```

#### **Vendor Payouts:**

```typescript
// After payment success, transfer to vendors
const transferData = {
  source: 'balance',
  amount: vendorAmount * 100,
  recipient: vendorPaystackCode, // Vendor's account code
  reason: `Payment for order ${orderId}`,
  currency: 'GHS',
};
```

## 🛠 **Required Environment Variables**

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# No marketplace account code needed for collection
# Vendors have their own account codes
```

## 📊 **Database Schema**

### **Store Model:**

```prisma
model Store {
  // ... existing fields
  vendorId              String?   // Link to vendor user
  paystackAccountCode   String?   // Vendor's Paystack account code
  paystackAccountActive Boolean   @default(false)
}
```

### **Payment Model:**

```prisma
model Payment {
  // ... existing fields
  metadata     Json?    // Stores transfer details for vendor payouts
}
```

## 🔄 **Complete Payment Flow**

### **1. Order Creation:**

```bash
POST /orders
{
  "items": [
    {"productId": "prod1", "quantity": 2},
    {"productId": "prod2", "quantity": 1}
  ]
}
```

### **2. Payment Initialization:**

```bash
POST /payments/initialize
{
  "orderId": "order123",
  "email": "customer@example.com",
  "amount": 15000  // 150 GHS
}
```

### **3. Customer Payment:**

- Customer pays 150 GHS to marketplace
- Marketplace receives full amount

### **4. Vendor Payouts (Automatic):**

```typescript
// Webhook triggers vendor payouts
await processVendorPayouts(orderId, paymentReference);

// Results in:
// - Vendor 1: Receives 95 GHS (95% of their items)
// - Vendor 2: Receives 47.5 GHS (95% of their items)
// - Marketplace: Keeps 7.5 GHS (5% commission)
```

## 🧪 **Testing the Implementation**

### **Test Vendor Setup:**

```bash
# 1. Create vendor user
POST /auth/register
{
  "email": "vendor@test.com",
  "password": "password123",
  "role": "VENDOR"
}

# 2. Create store
POST /vendor/stores
{
  "name": "Test Store",
  "description": "Test store"
}

# 3. Set vendor Paystack account code (manually)
# This would be done after Paystack approves vendor
UPDATE stores
SET paystackAccountCode = 'ACCT_vendor123',
    paystackAccountActive = true
WHERE id = 'store_id';
```

### **Test Payment Flow:**

```bash
# 1. Create order
POST /orders
{
  "items": [{"productId": "prod1", "quantity": 1}],
  "shippingAddress": {...}
}

# 2. Initialize payment
POST /payments/initialize
{
  "orderId": "order123",
  "email": "customer@test.com",
  "amount": 10000
}

# 3. Complete payment with test card
# 4. Check webhook processes vendor payout
```

## ⚠️ **Important Notes**

### **Vendor Onboarding:**

- **Manual process** - Paystack must approve each vendor
- **No automatic creation** - Vendors can't self-register for payments
- **Business verification** - Vendors need business documents
- **Account codes** - Each vendor gets unique Paystack account code

### **Transfer Limitations:**

- **Daily limits** - Paystack has transfer limits
- **Bank verification** - Vendors need verified bank accounts
- **Transfer fees** - Small fees may apply to transfers
- **Processing time** - Transfers may take 1-3 business days

### **Error Handling:**

- **Failed transfers** - Retry mechanism needed
- **Insufficient balance** - Check marketplace balance before transfers
- **Invalid recipient** - Validate vendor account codes
- **Transfer limits** - Handle daily/monthly limits

## 🚀 **Production Checklist**

- [ ] **Vendor Onboarding Process** - Manual Paystack approval
- [ ] **Transfer API Setup** - Configure transfer endpoints
- [ ] **Balance Monitoring** - Track marketplace balance
- [ ] **Error Handling** - Handle failed transfers
- [ ] **Audit Trail** - Log all transfers
- [ ] **Compliance** - Follow Paystack guidelines
- [ ] **Testing** - Test with real vendor accounts

## 📞 **Support Required**

- **Paystack Business Account** - Required for transfers
- **Vendor Verification** - Manual process with Paystack
- **Transfer Limits** - May need to request higher limits
- **Technical Support** - Paystack support for integration issues

This corrected implementation follows Paystack's actual marketplace guidelines and will work properly in production! 🎯
