# 🛍️ Marketplace API

A multi-vendor marketplace API built with Express.js, TypeScript, and Prisma. Features JWT authentication, role-based access control, and comprehensive product management.

## ✨ Features

- **🔐 Authentication**: JWT-based auth with access/refresh tokens
- **👥 Role-Based Access**: Customer vs Vendor roles
- **🏪 Multi-Vendor Stores**: Each vendor owns one store
- **📦 Product Management**: Full CRUD with multiple images per product
- **🖼️ Image Upload**: S3/MinIO integration with presigned URLs
- **📊 Analytics**: Best-selling products and store analytics
- **📚 Auto-Generated API Docs**: OpenAPI 3.1.0 from Zod schemas
- **🐳 Docker Ready**: Complete containerized setup
- **🧪 Comprehensive Testing**: Jest + Supertest

## 📚 Documentation

- **[Prisma Commands Guide](PRISMA_COMMANDS.md)** - Complete reference for Prisma operations in Docker vs local development
- **[Docker Setup Guide](DOCKER_SETUP.md)** - Docker configuration and commands
- **[Docker Commands Reference](DOCKER_COMMANDS.md)** - Quick reference for Docker operations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (recommended) or npm

### 1. Clone & Install

```bash
git clone <repository-url>
cd marketplace-api
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services

```bash
# Start all services (PostgreSQL, MinIO, API)
docker-compose up -d

# Or start just the database
docker-compose up postgres -d
```

### 4. Database Setup

```bash
# Run migrations
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# Seed database (optional)
pnpm prisma db seed
```

### 5. Start Development

```bash
pnpm dev
```

The API will be available at `http://localhost:4000`
API Documentation at `http://localhost:4000/docs`

## 📖 API Documentation

### Authentication

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User Profile

```http
GET /auth/me
Authorization: Bearer <access_token>
```

### Image Upload

#### Get Upload URL

```http
POST /upload/url
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fileName": "product-image.jpg",
  "fileType": "image/jpeg"
}
```

#### Delete Image

```http
DELETE /upload/images
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fileName": "uploads/product-image.jpg"
}
```

### Product Management

#### Create Product with Multiple Images

```http
POST /products
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "Blue Shirt",
  "price": 2500,
  "stock": 10,
  "imageUrl": "https://example.com/primary.jpg",
  "images": [
    {
      "fileName": "uploads/front-view.jpg",
      "fileUrl": "http://localhost:9000/marketplace-images/uploads/front-view.jpg",
      "altText": "Blue shirt front view",
      "isPrimary": true,
      "sortOrder": 0
    },
    {
      "fileName": "uploads/back-view.jpg",
      "fileUrl": "http://localhost:9000/marketplace-images/uploads/back-view.jpg",
      "altText": "Blue shirt back view",
      "isPrimary": false,
      "sortOrder": 1
    }
  ]
}
```

#### Add Images to Existing Product

```http
POST /vendor/products/{productId}/images
Authorization: Bearer <vendor_token>
Content-Type: application/json

[
  {
    "fileName": "uploads/side-view.jpg",
    "fileUrl": "http://localhost:9000/marketplace-images/uploads/side-view.jpg",
    "altText": "Blue shirt side view",
    "isPrimary": false,
    "sortOrder": 2
  }
]
```

#### Get Product Images

```http
GET /vendor/products/{productId}/images
Authorization: Bearer <vendor_token>
```

#### Update Product Image

```http
PUT /vendor/products/{productId}/images/{imageId}
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "altText": "Updated description",
  "isPrimary": true
}
```

#### Delete Product Image

```http
DELETE /vendor/products/{productId}/images/{imageId}
Authorization: Bearer <vendor_token>
```

#### Reorder Product Images

```http
PUT /vendor/products/{productId}/images/reorder
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "imageIds": ["img2", "img1", "img3"]
}
```

### Store Management

#### Create Store

```http
POST /stores
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "My Store",
  "slug": "my-store",
  "logoUrl": "http://localhost:9000/marketplace-images/uploads/store-logo.jpg"
}
```

## 🏗️ Architecture

### Database Schema

```
User (id, email, password, role)
├── Store (id, name, slug, logoUrl, ownerId)
│   └── Product (id, name, price, stock, imageUrl, storeId)
│       └── ProductImage (id, fileName, fileUrl, altText, isPrimary, sortOrder, productId)
└── Order (id, customerId, storeId, status, total)
    └── OrderItem (id, orderId, productId, quantity, price)
```

### Key Features

#### 🔐 Authentication Flow

1. User registers/logs in
2. JWT access token issued (15min expiry)
3. Refresh token issued (7 days expiry)
4. Access token used for API calls
5. Refresh endpoint to get new access token

#### 🖼️ Image Upload Flow

1. Client requests presigned URL from `/upload/url`
2. Client uploads directly to S3/MinIO using presigned URL
3. Client creates product with image URLs
4. Images automatically cleaned up on product deletion

#### 📦 Product Image Management

- **Multiple Images**: Each product can have multiple images (front, back, side views)
- **Primary Image**: One image marked as primary for thumbnails
- **Image Ordering**: Drag-and-drop reordering with sortOrder
- **Automatic Cleanup**: Images deleted when product is deleted
- **Backward Compatibility**: Existing `imageUrl` field still works

#### 🌐 CDN Configuration (Future Deployment)

The API is designed to work with CDNs for production deployment:

**Development (Current):**

```bash
CDN_BASE_URL=http://localhost:9000
```

**Production (Future):**

```bash
CDN_BASE_URL=https://images.yourmarketplace.com
```

**Benefits of CDN:**

- 5-10x faster image loading
- 75% cost reduction
- DDoS protection
- Global distribution

See `CDN_SETUP.md` for complete setup guide when ready to deploy.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/product-images.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### Test Structure

- `tests/auth.test.ts` - Authentication endpoints
- `tests/product-images.test.ts` - Product image management
- `tests/upload.test.ts` - Image upload functionality
- `tests/upload-integration.test.ts` - Upload integration with products/stores
- `tests/integration.test.ts` - End-to-end workflows

## 🐳 Docker

### Services

- **API**: Express.js application (port 4000)
- **PostgreSQL**: Database (port 5432)
- **MinIO**: S3-compatible object storage (ports 9000, 9001)

### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

## 🔧 Development

### Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm test         # Run tests
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

### Database

```bash
pnpm prisma studio    # Open Prisma Studio
pnpm prisma migrate dev  # Create and apply migration
pnpm prisma generate     # Generate Prisma client
pnpm prisma db seed      # Seed database
```

### OpenAPI Documentation

```bash
pnpm generate-spec  # Generate OpenAPI spec
```

## 📊 Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=marketplace-images
S3_REGION=us-east-1

# Server
PORT=4000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
