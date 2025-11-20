# Marketplace API Setup Guide

A comprehensive multi-tenant marketplace API for Ghana, featuring OTP verification, real-time chat, escrow payments, and more.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 16+
- MinIO (or AWS S3)
- Arkesel account (for SMS)
- Resend account (for email)
- Paystack account (for payments)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd marketplace-api

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your actual credentials
nano .env
```

### Database Setup

```bash
# Run migrations (creates all tables)
pnpm exec prisma migrate deploy

# Generate Prisma client
pnpm exec prisma generate

# (Optional) Seed database with sample data
pnpm run seed
```

### Start Development Server

```bash
# Development mode with hot reload
pnpm run dev

# Production build
pnpm run build
pnpm start
```

Server will run at: `http://localhost:4000`

---

## 📋 Features Implemented

### ✅ Phase 1: Authentication & Verification (COMPLETED)

#### OTP Verification System
- **Email OTP**: 6-digit code, 15-minute expiry
- **Phone OTP**: 6-digit code via Arkesel SMS, 5-minute expiry
- **Rate Limiting**: Max 3 OTPs per 10 minutes
- **Attempt Tracking**: Max 3 verification attempts per OTP

#### Endpoints
```
POST /otp/send-email          # Send email OTP
POST /otp/send-phone          # Send phone OTP (requires auth)
POST /otp/verify-email        # Verify email OTP
POST /otp/verify-phone        # Verify phone OTP (requires auth)
POST /otp/resend-email        # Resend email OTP
POST /otp/resend-phone        # Resend phone OTP (requires auth)
```

#### Registration Flow
1. User registers → Email OTP sent automatically
2. User verifies email → Can browse products
3. Before checkout → Phone verification required
4. Before publishing product → Phone verification required

### ✅ Database Schema (READY)

#### New Tables
- `OtpVerification` - Email/phone OTP management
- `Conversation` - Buyer-seller chat conversations
- `Message` - Chat messages
- `OrderDispute` - Dispute resolution
- `ProductReview` - Ratings and reviews
- `Wishlist` - Saved products

#### Updated Models
- `User` - Added `emailVerified`, `phoneVerified`, timestamps
- `Order` - Added delivery status, dispute status, settlement status, auto-release date
- `Product` - Added inventory tracking, review stats
- `Store` - Added Ghana Card photo URLs
- `VendorPayout` - Added escrow fields

### ✅ Services Available

#### Email Service (`email.service.ts`)
- Provider: Resend (3000 free emails/month)
- Beautiful HTML templates
- OTP emails, welcome emails, order confirmations, status updates

#### SMS Service (`sms.service.ts`)
- Provider: Arkesel (Ghana-focused)
- OTP via Arkesel OTP API
- Fallback to regular SMS
- Ghana phone number formatting

#### OTP Service (`otp.service.ts`)
- Complete OTP lifecycle management
- Database storage with expiry
- Rate limiting and attempt tracking

---

## ⏳ Features In Progress / TODO

### Phase 2: Chat System
- [ ] Socket.io server setup
- [ ] Real-time messaging
- [ ] Chat REST endpoints
- [ ] Unread message badges
- [ ] Typing indicators

### Phase 3: Escrow & Payments
- [ ] Update payment flow for 5-day escrow
- [ ] Delivery confirmation endpoints
- [ ] Auto-release cron job
- [ ] Dispute resolution workflow
- [ ] Admin dispute dashboard

### Phase 4: Marketplace Features
- [ ] Inventory management endpoints
- [ ] Low stock alerts
- [ ] Product reviews & ratings
- [ ] Wishlist endpoints
- [ ] Enhanced analytics

### Phase 5: Vendor Onboarding (Simplified)
- [ ] Remove complex Ghana Card verification
- [ ] Simple Ghana Card photo upload
- [ ] Instant store creation (no admin approval)
- [ ] Bank details optional at signup

---

## 🔑 API Keys & Setup

### 1. Resend (Email)

**Free Tier**: 3,000 emails/month

1. Sign up at https://resend.com
2. Get API key from dashboard
3. Verify your sending domain (or use `onboarding@resend.dev` for testing)

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@yourdomain.com
```

### 2. Arkesel (SMS - Ghana)

**Sign up**: https://arkesel.com

1. Create account
2. Get API key
3. Register sender ID (e.g., "MERCHANT")
4. Use sandbox mode for testing

```env
SMS_PROVIDER=arkesel
ARKESEL_API_KEY=your_api_key
ARKESEL_SENDER_ID=MERCHANT
ARKESEL_SANDBOX=true  # false in production
```

**Phone Format**: Ghana numbers should be in format `233XXXXXXXXX` or `0XXXXXXXXX`

### 3. Paystack (Payments - Ghana)

**Sign up**: https://paystack.com

1. Create account
2. Get test/live API keys
3. Create platform subaccount
4. Set webhook URL: `https://yourapi.com/payments/webhook`

```env
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
PAYSTACK_PLATFORM_SUBACCOUNT_CODE=ACCT_xxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxx
```

### 4. MinIO (Storage)

**Local Development**:

```bash
# Using Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

```env
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=marketplace-images
```

---

## 🗄️ Database Migrations

### Apply Migrations

```bash
# Apply all pending migrations
pnpm exec prisma migrate deploy

# Create new migration (after schema changes)
pnpm exec prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
pnpm exec prisma migrate reset
```

### Prisma Studio (Database GUI)

```bash
pnpm exec prisma studio
# Opens at http://localhost:5555
```

---

## 🧪 Testing

### Test OTP Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "CUSTOMER"
  }'

# 2. Check email for OTP (or check logs in development)

# 3. Verify email
curl -X POST http://localhost:4000/otp/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "purpose": "REGISTRATION"
  }'

# 4. Send phone OTP (with auth token)
curl -X POST http://localhost:4000/otp/send-phone \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0241234567",
    "purpose": "PHONE_VERIFICATION"
  }'

# 5. Verify phone OTP
curl -X POST http://localhost:4000/otp/verify-phone \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0241234567",
    "code": "123456",
    "purpose": "PHONE_VERIFICATION"
  }'
```

---

## 📖 API Documentation

### OpenAPI/Swagger

Once the server is running, visit:
```
http://localhost:4000/docs
```

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user (sends email OTP)
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh tokens
- `GET /auth/me` - Get current user (includes verification status)
- `PUT /auth/me` - Update user profile

#### OTP Verification
- `POST /otp/send-email` - Send email verification code
- `POST /otp/send-phone` - Send phone verification code
- `POST /otp/verify-email` - Verify email code
- `POST /otp/verify-phone` - Verify phone code
- `POST /otp/resend-email` - Resend email code
- `POST /otp/resend-phone` - Resend phone code

#### Products
- `GET /products` - List all products
- `POST /products` - Create product (requires phone verification)
- `GET /products/:id` - Get product details
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Payments
- `POST /payments/initialize` - Initialize payment (requires phone verification)
- `POST /payments/verify` - Verify payment
- `GET /payments/history` - Payment history

---

## 🔒 Security Features

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 20 requests per minute
- OTP endpoints: 3 OTPs per 10 minutes per recipient

### Verification Gates
- **Email verification**: Required to access account features
- **Phone verification**: Required before:
  - Checkout/payment
  - Publishing products

### Password Security
- Bcrypt hashing (10 rounds)
- Minimum 8 characters required

### JWT Tokens
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry

---

## 🚀 Deployment

### Environment Variables

Ensure all production values are set in `.env`:
- Use strong `JWT_SECRET`
- Set `NODE_ENV=production`
- Use production API keys (Resend, Arkesel, Paystack)
- Configure proper CORS origins
- Disable sandbox modes

### Database

```bash
# Run migrations
pnpm exec prisma migrate deploy

# Generate Prisma client
pnpm exec prisma generate
```

### Build & Start

```bash
# Build TypeScript
pnpm run build

# Start production server
NODE_ENV=production pnpm start
```

### Health Check

```bash
curl http://localhost:4000/health
```

---

## 🛠️ Development Tips

### Mock Mode for Testing

Use mock providers to test without external services:

```env
EMAIL_PROVIDER=mock
SMS_PROVIDER=mock
```

Emails and SMS will be logged to console instead of being sent.

### Database Reset

```bash
# Reset database and re-run all migrations
pnpm exec prisma migrate reset

# Then seed with sample data
pnpm run seed
```

### View Database

```bash
# Open Prisma Studio
pnpm exec prisma studio
```

---

## 📝 Next Steps

1. **Frontend Integration**
   - Implement OTP verification UI
   - Add phone verification modal before checkout/publish
   - Show verification status on user profile

2. **Complete Remaining Features**
   - Chat system (Socket.io)
   - Escrow payment flow
   - Dispute resolution
   - Product reviews
   - Inventory management

3. **Production Setup**
   - Configure domain and SSL
   - Set up monitoring (Sentry, LogRocket)
   - Configure backup strategy
   - Set up CI/CD pipeline

---

## 🆘 Troubleshooting

### Prisma Engine Download Errors

If you get Prisma engine download errors:
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm exec prisma generate
```

### Port Already in Use

```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

### Database Connection Issues

Check PostgreSQL is running:
```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

---

## 📧 Support

For issues or questions:
- Check the documentation above
- Review API endpoint responses for error details
- Check server logs for detailed error messages

---

## 🎉 What's Working Now

✅ **User Registration** with automatic email OTP
✅ **Email Verification** (6-digit code, 15-min expiry)
✅ **Phone Verification** (6-digit SMS, 5-min expiry)
✅ **Verification Gates** (phone required before checkout/publish)
✅ **Multi-tenant Stores** (vendor storefronts)
✅ **Product Management** (CRUD operations)
✅ **Shopping Cart** (add, update, remove items)
✅ **Payment Processing** (Paystack integration with splits)
✅ **Order Management** (tracking, status updates)
✅ **Vendor Payouts** (automated settlement)
✅ **File Uploads** (S3/MinIO for images)
✅ **Notifications** (email, SMS, in-app)

🚧 **Coming Soon**: Chat, Escrow, Reviews, Disputes, Enhanced Analytics
