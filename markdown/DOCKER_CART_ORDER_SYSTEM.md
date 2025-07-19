# Docker Cart & Order System Implementation Guide

## 🚀 Overview

This document describes the Docker implementation of the core cart and order system for the e-commerce marketplace API, including cart management, order processing, and inventory management.

## 📋 Cart & Order System Features

### ✅ Core Functionality

- **Cart Management**: Add, update, remove items with inventory validation
- **Order Creation**: Complete checkout flow with calculations
- **Inventory Management**: Real-time stock updates and reservation
- **Database Schema**: Enhanced models with proper relationships
- **Type Safety**: Full TypeScript support with Zod validation

### ✅ Technical Enhancements

- **Prisma Client**: Regenerated with latest schema
- **Database Migrations**: Proper schema synchronization
- **Health Checks**: Service dependency management
- **Environment Configuration**: Docker-specific settings

## 🐳 Docker Configuration

### Files Updated/Created

1. **Dockerfile** - Enhanced with cart and order system requirements
2. **docker-compose.yml** - Updated with health checks and dependencies
3. **docker-entrypoint.sh** - Proper initialization script
4. **.docker.env** - Docker-specific environment variables

### Key Changes

#### Dockerfile Enhancements

```dockerfile
# Added PostgreSQL client for health checks
RUN apt-get update && apt-get install -y postgresql-client

# Enhanced Prisma generation
RUN pnpm prisma generate

# Custom entrypoint for proper initialization
ENTRYPOINT ["./docker-entrypoint.sh"]
```

#### Docker Compose Improvements

```yaml
# Health checks for dependencies
depends_on:
  postgres:
    condition: service_healthy
  minio:
    condition: service_healthy

# Environment file support
env_file:
  - .docker.env
```

## 🚀 Quick Start

### 1. Build and Start Services

```bash
# Build the Docker image with cart and order system
docker-compose build

# Start all services
docker-compose up -d
```

### 2. Verify Cart & Order System

```bash
# Check API health
curl http://localhost:4000/docs/health

# Run comprehensive tests
npm test -- tests/cart-order-services.test.ts
```

### 3. Access Services

- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/docs
- **Database**: localhost:5432
- **MinIO**: http://localhost:9000

## 🧪 Testing Cart & Order System in Docker

### Automated Testing

```bash
# Run the comprehensive test suite
npm test -- tests/cart-order-services.test.ts
```

### Manual Testing

```bash
# Test cart functionality
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"productId": "product-id", "quantity": 2}'

# Test order creation
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"storeId": "store-id", "shippingAddress": {...}}'
```

## 🔧 Configuration

### Environment Variables (.docker.env)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace?schema=public

# S3/MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

### Optional Settings

```bash
# Enable database seeding
SEED_DATABASE=true docker-compose up
```

## 📊 Monitoring

### Health Checks

- **PostgreSQL**: `pg_isready` command
- **MinIO**: HTTP health endpoint
- **API**: `/docs/health` endpoint

### Logs

```bash
# View API logs
docker-compose logs -f api

# View database logs
docker-compose logs -f postgres

# View all logs
docker-compose logs -f
```

## 🔄 Development Workflow

### 1. Local Development

```bash
# Start services
docker-compose up -d postgres minio

# Run API locally
pnpm dev
```

### 2. Docker Development

```bash
# Full Docker environment
docker-compose up -d

# Rebuild after changes
docker-compose build api
docker-compose up -d api
```

### 3. Testing

```bash
# Run tests locally
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketplace?schema=public" npm test

# Run tests in Docker
docker-compose exec api npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check if postgres is running
   docker-compose ps postgres

   # Check logs
   docker-compose logs postgres
   ```

2. **Prisma Client Not Generated**

   ```bash
   # Regenerate client
   docker-compose exec api pnpm prisma generate
   ```

3. **Schema Not Synced**
   ```bash
   # Push schema changes
   docker-compose exec api pnpm prisma db push
   ```

### Reset Environment

```bash
# Stop and remove everything
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## 📈 Performance Considerations

### Resource Limits

```yaml
# Add to docker-compose.yml if needed
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

### Database Optimization

- Connection pooling configured
- Proper indexing on frequently queried fields
- Transaction management for data consistency

## 🔒 Security

### Production Considerations

1. **Change default passwords**
2. **Use proper JWT secrets**
3. **Enable HTTPS**
4. **Configure proper CORS**
5. **Set up proper firewall rules**

### Environment Variables

```bash
# Production environment file
cp .docker.env .docker.prod.env
# Edit with production values
```

## 📚 Next Steps

The cart and order system is now fully implemented and tested in Docker. Ready for:

1. **Payment Integration**: Paystack integration
2. **Customer Experience**: Reviews, ratings, recommendations
3. **Vendor Management**: Advanced vendor features
4. **Advanced Features**: Analytics, notifications, etc.

## 🎯 Success Criteria

- ✅ All cart and order tests passing
- ✅ Docker environment properly configured
- ✅ Database schema synchronized
- ✅ Health checks working
- ✅ API endpoints accessible
- ✅ Cart and order functionality validated

---

**Cart & Order System Docker Implementation Complete! 🚀**
