# Comprehensive Testing Guide

Complete guide for testing the marketplace API's OTP verification system and verification gates.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Testing Tools](#testing-tools)
4. [Test Scenarios](#test-scenarios)
5. [Database Verification](#database-verification)
6. [Error Testing](#error-testing)
7. [Load Testing](#load-testing)

---

## ✅ Prerequisites

Before testing, ensure you have:

- ✅ PostgreSQL running
- ✅ API server running (`pnpm run dev`)
- ✅ Database migrated (`pnpm exec prisma migrate deploy`)
- ✅ Environment variables configured (`.env`)
- ✅ Email provider configured (Resend or mock)
- ✅ SMS provider configured (Arkesel or mock)

---

## 🔧 Environment Setup

### 1. Start the Database

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Or using Docker
docker run -d \
  --name marketplace-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=marketplace_db \
  -p 5432:5432 \
  postgres:16
```

### 2. Run Migrations

```bash
cd /home/user/marketplace-api

# Apply all migrations
pnpm exec prisma migrate deploy

# Generate Prisma client
pnpm exec prisma generate

# (Optional) Open Prisma Studio to view database
pnpm exec prisma studio
# Opens at http://localhost:5555
```

### 3. Configure Test Environment

Create a `.env.test` file for testing:

```bash
cp .env .env.test
```

Edit `.env.test`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace_test
FRONTEND_URL=http://localhost:3000

# Use MOCK providers for testing (no external API calls)
EMAIL_PROVIDER=mock
SMS_PROVIDER=mock

# JWT
JWT_SECRET=test-secret-key-123
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# (Optional) Use real services for integration testing
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_test_xxx
# SMS_PROVIDER=arkesel
# ARKESEL_API_KEY=test_xxx
# ARKESEL_SANDBOX=true
```

### 4. Start the Server

```bash
# Development mode
pnpm run dev

# You should see:
# 🚀 Listening on http://localhost:4000
```

---

## 🛠️ Testing Tools

### Option 1: cURL (Command Line)

All examples below use cURL. Easy to copy-paste and run.

### Option 2: Postman/Insomnia

1. Import the OpenAPI spec: `http://localhost:4000/docs`
2. Create environment variables:
   - `BASE_URL`: `http://localhost:4000`
   - `ACCESS_TOKEN`: (set after login)

### Option 3: VS Code REST Client

Install the REST Client extension and create a `test.http` file:

```http
@baseUrl = http://localhost:4000
@accessToken = your_token_here

### Register
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User",
  "role": "CUSTOMER"
}
```

---

## 🧪 Test Scenarios

### Test 1: User Registration with Email OTP

**Goal**: Verify that registration creates user and sends email OTP.

```bash
# 1. Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0241234567",
    "role": "CUSTOMER"
  }'
```

**Expected Response (201)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "clx123...",
    "email": "test1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0241234567",
    "emailVerified": false,
    "phoneVerified": false,
    "emailVerifiedAt": null,
    "phoneVerifiedAt": null,
    "role": "CUSTOMER",
    "storeId": null,
    "createdAt": "2025-01-20T00:00:00.000Z"
  },
  "message": "Registration successful. Please check your email for verification code.",
  "emailVerificationSent": true
}
```

**Verification Checklist**:
- ✅ Response status is 201
- ✅ User object returned with `emailVerified: false`
- ✅ `emailVerificationSent: true` in response
- ✅ Access and refresh tokens provided
- ✅ Check server logs for OTP email sent (if using mock provider)
- ✅ Check actual email inbox (if using real provider)

**Check Database**:
```bash
# Open Prisma Studio
pnpm exec prisma studio

# Or use psql
psql -U postgres -d marketplace_db -c "
  SELECT id, email, \"emailVerified\", \"phoneVerified\", \"createdAt\"
  FROM \"User\"
  WHERE email = 'test1@example.com';
"

# Check OTP record
psql -U postgres -d marketplace_db -c "
  SELECT id, type, purpose, recipient, code, \"expiresAt\", \"isUsed\"
  FROM \"OtpVerification\"
  WHERE recipient = 'test1@example.com';
"
```

---

### Test 2: Email OTP Verification

**Goal**: Verify email with the OTP code.

```bash
# If using MOCK provider, check server logs for the OTP code
# If using real provider, check your email

# Example OTP from logs: "Your verification code is: 123456"

# 2. Verify email OTP
curl -X POST http://localhost:4000/otp/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "code": "123456",
    "purpose": "REGISTRATION"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Verification successful"
}
```

**Verification Checklist**:
- ✅ Response status is 200
- ✅ `success: true` in response

**Check Database**:
```bash
# User should now have emailVerified = true
psql -U postgres -d marketplace_db -c "
  SELECT email, \"emailVerified\", \"emailVerifiedAt\"
  FROM \"User\"
  WHERE email = 'test1@example.com';
"

# OTP should be marked as used
psql -U postgres -d marketplace_db -c "
  SELECT recipient, code, \"isUsed\", \"verifiedAt\"
  FROM \"OtpVerification\"
  WHERE recipient = 'test1@example.com';
"
```

---

### Test 3: Login After Email Verification

**Goal**: Login and verify that user data includes verification status.

```bash
# 3. Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "password123"
  }'
```

**Expected Response (200)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "clx123...",
    "email": "test1@example.com",
    "emailVerified": true,     // ✅ Should be true
    "phoneVerified": false,    // ✅ Still false
    "emailVerifiedAt": "2025-01-20T01:00:00.000Z",
    "phoneVerifiedAt": null,
    ...
  }
}
```

**Save the access token for next tests**:
```bash
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR..."
```

---

### Test 4: Phone OTP Send

**Goal**: Send OTP to phone number.

```bash
# 4. Send phone OTP
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0241234567",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "expiresIn": 5
}
```

**Verification Checklist**:
- ✅ Response status is 200
- ✅ Check server logs for SMS sent (if using mock)
- ✅ Check phone for SMS (if using real Arkesel)

**Check Database**:
```bash
psql -U postgres -d marketplace_db -c "
  SELECT type, recipient, code, \"expiresAt\", purpose
  FROM \"OtpVerification\"
  WHERE recipient LIKE '%241234567%'
  ORDER BY \"createdAt\" DESC
  LIMIT 1;
"
```

---

### Test 5: Phone OTP Verification

**Goal**: Verify phone number with OTP code.

```bash
# Get the OTP code from logs/SMS
# Example: 654321

# 5. Verify phone OTP
curl -X POST http://localhost:4000/otp/verify-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0241234567",
    "code": "654321",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Verification successful"
}
```

**Check Database**:
```bash
# User should now have phoneVerified = true
psql -U postgres -d marketplace_db -c "
  SELECT email, phone, \"emailVerified\", \"phoneVerified\", \"phoneVerifiedAt\"
  FROM \"User\"
  WHERE email = 'test1@example.com';
"
```

---

### Test 6: Phone Verification Gate (Payment)

**Goal**: Verify that payment requires phone verification.

#### Test 6a: Without Phone Verification

```bash
# 6a. Try to initialize payment WITHOUT phone verification
# First, create a new user without phone verification

curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nophone@example.com",
    "password": "password123",
    "firstName": "No",
    "lastName": "Phone",
    "role": "CUSTOMER"
  }'

# Get the access token from response
export NO_PHONE_TOKEN="..."

# Try to initialize payment
curl -X POST http://localhost:4000/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "orderId": "order_test_123",
    "email": "nophone@example.com",
    "amount": 10000
  }'
```

**Expected Response (403)**:
```json
{
  "message": "Phone number required",
  "code": "PHONE_NOT_SET",
  "action": "Please add a phone number to your profile"
}
```

#### Test 6b: With Phone But Not Verified

```bash
# Update user to add phone
curl -X PUT http://localhost:4000/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "phone": "0241111111"
  }'

# Try payment again
curl -X POST http://localhost:4000/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "orderId": "order_test_124",
    "email": "nophone@example.com",
    "amount": 10000
  }'
```

**Expected Response (403)**:
```json
{
  "message": "Phone verification required",
  "code": "PHONE_NOT_VERIFIED",
  "action": "Please verify your phone number to continue",
  "phone": "0241111111"
}
```

#### Test 6c: With Phone Verified

```bash
# Verify phone first
# 1. Send OTP
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "phone": "0241111111",
    "purpose": "PHONE_VERIFICATION"
  }'

# 2. Get code from logs, then verify
curl -X POST http://localhost:4000/otp/verify-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "phone": "0241111111",
    "code": "123456",
    "purpose": "PHONE_VERIFICATION"
  }'

# 3. Now payment should work
curl -X POST http://localhost:4000/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NO_PHONE_TOKEN" \
  -d '{
    "orderId": "order_test_125",
    "email": "nophone@example.com",
    "amount": 10000
  }'
```

**Expected Response (200)**: Payment initialization succeeds.

---

### Test 7: Phone Verification Gate (Product Creation)

**Goal**: Verify that creating products requires phone verification.

```bash
# Register as vendor
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@example.com",
    "password": "password123",
    "firstName": "Vendor",
    "lastName": "User",
    "role": "VENDOR"
  }'

export VENDOR_TOKEN="..."

# Try to create product WITHOUT phone verification
curl -X POST http://localhost:4000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 5000,
    "stock": 10,
    "category": "Electronics",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

**Expected Response (403)**:
```json
{
  "message": "Phone verification required",
  "code": "PHONE_NOT_VERIFIED",
  "action": "Please verify your phone number to continue"
}
```

---

### Test 8: OTP Resend

**Goal**: Test OTP resend functionality.

```bash
# 8a. Send initial email OTP
curl -X POST http://localhost:4000/otp/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "resend@example.com",
    "purpose": "REGISTRATION"
  }'

# 8b. Wait a few seconds, then resend
sleep 5

curl -X POST http://localhost:4000/otp/resend-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "resend@example.com",
    "purpose": "REGISTRATION"
  }'
```

**Expected Response (200)**: New OTP sent successfully.

**Check Database**:
```bash
# Should see multiple OTP records, old ones marked as used
psql -U postgres -d marketplace_db -c "
  SELECT recipient, code, \"isUsed\", \"createdAt\"
  FROM \"OtpVerification\"
  WHERE recipient = 'resend@example.com'
  ORDER BY \"createdAt\" DESC;
"
```

---

### Test 9: Rate Limiting

**Goal**: Verify rate limiting (max 3 OTPs per 10 minutes).

```bash
# Send OTP 3 times rapidly
for i in {1..3}; do
  curl -X POST http://localhost:4000/otp/send-email \
    -H "Content-Type: application/json" \
    -d '{
      "email": "ratelimit@example.com",
      "purpose": "REGISTRATION"
    }'
  echo "\nAttempt $i completed"
  sleep 2
done

# 4th attempt should fail
curl -X POST http://localhost:4000/otp/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ratelimit@example.com",
    "purpose": "REGISTRATION"
  }'
```

**Expected Response (429)**:
```json
{
  "success": false,
  "message": "Too many requests. Please try again in 10 minutes."
}
```

---

### Test 10: Invalid OTP Attempts

**Goal**: Verify attempt tracking (max 3 attempts).

```bash
# Send OTP
curl -X POST http://localhost:4000/otp/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attempts@example.com",
    "purpose": "REGISTRATION"
  }'

# Try wrong code 3 times
for i in {1..3}; do
  curl -X POST http://localhost:4000/otp/verify-email \
    -H "Content-Type: application/json" \
    -d '{
      "email": "attempts@example.com",
      "code": "000000",
      "purpose": "REGISTRATION"
    }'
  echo "\nWrong attempt $i"
done
```

**Expected Responses**:
- Attempt 1: `"Invalid verification code. 2 attempt(s) remaining."`
- Attempt 2: `"Invalid verification code. 1 attempt(s) remaining."`
- Attempt 3: `"Invalid verification code. 0 attempt(s) remaining."`

**4th attempt**:
```bash
curl -X POST http://localhost:4000/otp/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attempts@example.com",
    "code": "123456",
    "purpose": "REGISTRATION"
  }'
```

**Expected Response**: `"Too many failed attempts. Please request a new code."`

---

### Test 11: Expired OTP

**Goal**: Verify OTP expiry (15 min for email, 5 min for phone).

**Note**: This test requires waiting or manually updating the database.

#### Option A: Wait for expiry (slow)

```bash
# Send OTP
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0240000000",
    "purpose": "PHONE_VERIFICATION"
  }'

# Wait 6 minutes (phone OTP expires in 5 minutes)
sleep 360

# Try to verify
curl -X POST http://localhost:4000/otp/verify-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0240000000",
    "code": "123456",
    "purpose": "PHONE_VERIFICATION"
  }'
```

#### Option B: Manually expire in database (fast)

```bash
# Send OTP first
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0240000000",
    "purpose": "PHONE_VERIFICATION"
  }'

# Manually expire in database
psql -U postgres -d marketplace_db -c "
  UPDATE \"OtpVerification\"
  SET \"expiresAt\" = NOW() - INTERVAL '1 minute'
  WHERE recipient LIKE '%240000000%';
"

# Try to verify
curl -X POST http://localhost:4000/otp/verify-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "0240000000",
    "code": "123456",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected Response (400)**:
```json
{
  "success": false,
  "message": "Invalid or expired verification code"
}
```

---

### Test 12: Get Current User (Me Endpoint)

**Goal**: Verify that /auth/me returns verification status.

```bash
# Get current user
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200)**:
```json
{
  "user": {
    "id": "clx123...",
    "email": "test1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0241234567",
    "emailVerified": true,
    "phoneVerified": true,
    "emailVerifiedAt": "2025-01-20T01:00:00.000Z",
    "phoneVerifiedAt": "2025-01-20T01:05:00.000Z",
    "role": "CUSTOMER",
    "storeId": null,
    "createdAt": "2025-01-20T00:00:00.000Z",
    "updatedAt": "2025-01-20T01:05:00.000Z"
  }
}
```

---

## 🗄️ Database Verification

### Check All Users

```sql
SELECT
  email,
  "emailVerified",
  "phoneVerified",
  "emailVerifiedAt",
  "phoneVerifiedAt",
  "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;
```

### Check All OTP Records

```sql
SELECT
  type,
  purpose,
  recipient,
  code,
  "expiresAt",
  "isUsed",
  "verifiedAt",
  attempts,
  "createdAt"
FROM "OtpVerification"
ORDER BY "createdAt" DESC
LIMIT 20;
```

### Check Expired OTPs

```sql
SELECT COUNT(*) as expired_count
FROM "OtpVerification"
WHERE "expiresAt" < NOW() AND "isUsed" = false;
```

### Cleanup Old OTPs

```sql
-- Delete expired OTPs older than 24 hours
DELETE FROM "OtpVerification"
WHERE "expiresAt" < NOW() - INTERVAL '24 hours';
```

---

## ❌ Error Testing

### Test Error Scenarios

#### 1. Invalid Email Format

```bash
curl -X POST http://localhost:4000/otp/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "purpose": "REGISTRATION"
  }'
```

**Expected**: 400 Bad Request

#### 2. Invalid Phone Format

```bash
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "phone": "123",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected**: 400 Bad Request - "Invalid phone number format"

#### 3. Missing Authorization

```bash
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0241234567",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected**: 401 Unauthorized

#### 4. Invalid Token

```bash
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_123" \
  -d '{
    "phone": "0241234567",
    "purpose": "PHONE_VERIFICATION"
  }'
```

**Expected**: 401 Unauthorized - "Invalid or expired token"

#### 5. Email Already Registered

```bash
# Try to register with existing email
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "password123",
    "firstName": "Duplicate",
    "lastName": "User",
    "role": "CUSTOMER"
  }'
```

**Expected**: 409 Conflict - "Email already in use"

---

## 🔥 Load Testing

### Using Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test registration endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -p register.json -T application/json \
  http://localhost:4000/auth/register
```

**register.json**:
```json
{
  "email": "loadtest@example.com",
  "password": "password123",
  "firstName": "Load",
  "lastName": "Test",
  "role": "CUSTOMER"
}
```

### Using Artillery

```bash
# Install Artillery
npm install -g artillery

# Create artillery config
cat > artillery-test.yml <<EOF
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Registration Flow"
    flow:
      - post:
          url: "/auth/register"
          json:
            email: "test{{ \$randomNumber() }}@example.com"
            password: "password123"
            firstName: "Test"
            lastName: "User"
            role: "CUSTOMER"
EOF

# Run test
artillery run artillery-test.yml
```

---

## ✅ Testing Checklist

### Core Functionality
- [ ] User registration works
- [ ] Email OTP sent after registration
- [ ] Email OTP verification works
- [ ] Phone OTP send works
- [ ] Phone OTP verification works
- [ ] OTP resend works (email & phone)
- [ ] Login returns verification status
- [ ] /auth/me returns verification status

### Verification Gates
- [ ] Payment blocked without phone verification
- [ ] Product creation blocked without phone verification
- [ ] Proper error messages with action codes

### Rate Limiting & Security
- [ ] Max 3 OTPs per 10 minutes enforced
- [ ] Max 3 verification attempts enforced
- [ ] OTP expiry works (15 min email, 5 min phone)
- [ ] Invalid tokens rejected
- [ ] Authorization required where needed

### Error Handling
- [ ] Invalid email format rejected
- [ ] Invalid phone format rejected
- [ ] Expired OTP rejected
- [ ] Wrong OTP code shows remaining attempts
- [ ] Duplicate email registration rejected

### Database
- [ ] User verification flags update correctly
- [ ] OTP records created properly
- [ ] Old OTPs invalidated on resend
- [ ] Verified OTPs marked as used

---

## 📊 Test Report Template

Use this template to document your test results:

```markdown
# Test Report - [Date]

## Environment
- API Version: [version]
- Database: PostgreSQL [version]
- Email Provider: [Resend/Mock]
- SMS Provider: [Arkesel/Mock]

## Test Results

### Registration Flow
- ✅ User registration: PASS
- ✅ Email OTP sent: PASS
- ✅ Email verification: PASS
- Total: 3/3 PASSED

### Phone Verification
- ✅ Phone OTP sent: PASS
- ✅ Phone verification: PASS
- Total: 2/2 PASSED

### Verification Gates
- ✅ Payment gate: PASS
- ✅ Product creation gate: PASS
- Total: 2/2 PASSED

### Error Handling
- ✅ Invalid email: PASS
- ✅ Invalid phone: PASS
- ✅ Rate limiting: PASS
- ✅ Attempt limiting: PASS
- Total: 4/4 PASSED

## Issues Found
1. [Issue description]
2. [Issue description]

## Overall Status
- Tests Passed: XX/XX
- Tests Failed: XX/XX
- Pass Rate: XX%
```

---

## 🆘 Troubleshooting

### Issue: OTP not appearing in logs

**Solution**: Ensure `EMAIL_PROVIDER=mock` or `SMS_PROVIDER=mock` in `.env`

### Issue: Database connection error

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check DATABASE_URL in .env is correct
```

### Issue: "User not found" after verification

**Solution**: Ensure you're using the same email/phone in verification request

### Issue: Token expired during testing

**Solution**: Tokens expire after 15 minutes. Get a new token:
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

---

## 🎉 You're Ready to Test!

Run through all test scenarios and check off the checklist. Report any issues you find!

For questions or issues, refer to:
- [SETUP.md](../SETUP.md) - Setup guide
- [FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md) - Frontend integration
- API Docs: http://localhost:4000/docs
