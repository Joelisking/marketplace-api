# Development Setup Guide

This guide covers setting up the marketplace API for local development without CDN.

## Current Development Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketplace"

# S3/MinIO Configuration (Local Development)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=marketplace-images
S3_REGION=us-east-1

# CDN Configuration (Development - Direct MinIO access)
CDN_BASE_URL=http://localhost:9000

# JWT Configuration
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

### Image URLs in Development

In development, images are served directly from MinIO:

```
Development URL: http://localhost:9000/marketplace-images/uploads/image.jpg
```

This works perfectly for:

- ✅ Local development
- ✅ Testing
- ✅ Debugging
- ✅ No external dependencies

## Running the Application

### 1. Start Services with Docker

```bash
# Start all services (API, PostgreSQL, MinIO)
docker-compose up -d

# Check if services are running
docker-compose ps
```

### 2. Run Database Migrations

```bash
# Apply database migrations
pnpm prisma migrate dev

# Seed the database (optional)
pnpm prisma db seed
```

### 3. Start the API

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Testing Image Upload

### 1. Get Upload URL

```bash
curl -X POST http://localhost:4000/upload/presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "contentType": "image/jpeg",
    "fileSize": 1024000
  }'
```

### 2. Expected Response

```json
{
  "uploadUrl": "http://localhost:9000/marketplace-images/uploads/...",
  "fileUrl": "http://localhost:9000/marketplace-images/uploads/1234567890-abc123.jpg",
  "fileName": "uploads/1234567890-abc123.jpg",
  "expiresIn": 3600
}
```

### 3. Upload Image

```bash
# Use the uploadUrl to upload the actual file
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: image/jpeg" \
  --upload-file path/to/your/image.jpg
```

### 4. Create Product with Image

```bash
curl -X POST http://localhost:4000/vendor/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 2500,
    "stock": 10,
    "imageUrl": "http://localhost:9000/marketplace-images/uploads/1234567890-abc123.jpg",
    "images": [
      {
        "fileName": "uploads/1234567890-abc123.jpg",
        "fileUrl": "http://localhost:9000/marketplace-images/uploads/1234567890-abc123.jpg",
        "altText": "Test product image",
        "isPrimary": true,
        "sortOrder": 0
      }
    ]
  }'
```

## Development Workflow

### 1. Image Upload Flow

```
1. Client requests presigned URL
2. Client uploads to MinIO using presigned URL
3. Client creates product with image URLs
4. Images served directly from MinIO
```

### 2. Testing Different Scenarios

- ✅ Single image products
- ✅ Multiple image products
- ✅ Image reordering
- ✅ Primary image changes
- ✅ Image deletion
- ✅ Product deletion (cleanup)

### 3. Debugging

#### Check MinIO Console

- Go to http://localhost:9001
- Login: minio / minio123
- Browse marketplace-images bucket

#### Check Database

```bash
# View product images
pnpm prisma studio
```

#### Check Logs

```bash
# API logs
docker-compose logs api

# MinIO logs
docker-compose logs minio
```

## Performance in Development

### Current Setup Performance

```
Image Loading: ~50-100ms (local network)
Storage: Local MinIO instance
Caching: None (development)
```

### Why This is Perfect for Development

- ✅ Fast enough for development
- ✅ No external dependencies
- ✅ Easy to debug
- ✅ No costs
- ✅ Works offline

## When to Add CDN

You should consider adding CDN when:

1. **Deploying to Production**
   - You have a domain name
   - You're ready to go live
   - You expect real users

2. **Performance Requirements**
   - Images are large (>1MB)
   - You have many concurrent users
   - Users are in different locations

3. **Cost Optimization**
   - High bandwidth usage
   - Want to reduce server costs

## Migration Path to Production

When you're ready to deploy:

1. **Get a domain name**
2. **Deploy your API** (Heroku, AWS, etc.)
3. **Set up Cloudflare** (see CDN_SETUP.md)
4. **Update environment variables**:

   ```bash
   # Change from:
   CDN_BASE_URL=http://localhost:9000

   # To:
   CDN_BASE_URL=https://images.yourmarketplace.com
   ```

5. **No code changes needed!** The API is already CDN-ready.

## Troubleshooting

### Images Not Loading

1. Check if MinIO is running: `docker-compose ps`
2. Check MinIO console: http://localhost:9001
3. Verify bucket exists: marketplace-images
4. Check file permissions

### Upload Failures

1. Check presigned URL expiration (1 hour)
2. Verify content-type matches
3. Check file size limits (10MB)
4. Verify authorization token

### Database Issues

1. Run migrations: `pnpm prisma migrate dev`
2. Reset database: `pnpm prisma migrate reset`
3. Check connection: `pnpm prisma studio`

## Next Steps

1. **Continue development** with current setup
2. **Test all image features** thoroughly
3. **Prepare for deployment** when ready
4. **Follow CDN_SETUP.md** when deploying

The current setup is perfect for development and testing. Focus on building your features, and worry about CDN optimization when you're ready to deploy to production!
