# Docker Commands Quick Reference

## 🚀 Essential Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart api
```

### Database Operations

```bash
# Run migrations
docker-compose exec api npx prisma migrate deploy

# Seed database
docker-compose exec api npx prisma db seed

# Access Prisma Studio (GUI)
docker-compose exec api npx prisma studio --port 5555
# Open http://localhost:5555 in browser

# Generate Prisma client
docker-compose exec api npx prisma generate

# Create new migration
docker-compose exec api npx prisma migrate dev --name migration_name

# Reset database (⚠️ destroys data)
docker-compose exec api npx prisma migrate reset

# View migration status
docker-compose exec api npx prisma migrate status

# Validate schema
docker-compose exec api npx prisma validate

# Format schema
docker-compose exec api npx prisma format

# Check DB connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"
```

### Testing

```bash
# Run all tests
docker-compose exec api npm test

# Run specific test
docker-compose exec api npm test -- tests/catalogue.test.ts
```

### Logs & Monitoring

```bash
# View all logs
docker-compose logs

# Follow API logs
docker-compose logs -f api

# View container status
docker-compose ps
```

### Development

```bash
# Run Open API spec
pnpm generate:spec

# Rebuild API image
docker-compose build api

# Access API container shell
docker-compose exec api sh

# Access database
docker-compose exec postgres psql -U postgres -d marketplace

# Access Prisma Studio (GUI)
docker-compose exec api npx prisma studio --port 5555
```

## 🗄️ Prisma Quick Reference

### Schema Management

```bash
# Validate schema
docker-compose exec api npx prisma validate

# Format schema
docker-compose exec api npx prisma format

# Generate client after deploying
docker-compose exec api npx prisma generate

# Pull schema from DB
docker-compose exec api npx prisma db pull

# Push schema to DB (dev only)
docker-compose exec api npx prisma db push
```

### Migration Workflow

```bash
# Create migration
docker-compose exec api npx prisma migrate dev --name add_user_profile

# Deploy migrations
docker-compose exec api npx prisma migrate deploy

# Check status
docker-compose exec api npx prisma migrate status

# Reset DB
docker-compose exec api npx prisma migrate reset --force
```

### Database Operations

```bash
# Test connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"

# Execute SQL file
docker-compose exec api npx prisma db execute --file ./scripts/query.sql

# Reset & seed
docker-compose exec api npx prisma migrate reset --force && docker-compose exec api npx prisma db seed
```

## 🔧 Troubleshooting

### Common Issues

```bash
# Port conflict
lsof -i :4000

# Database connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"

# Rebuild everything
docker-compose down -v && docker-compose up -d --build
```

### Cleanup

```bash
# Remove everything
docker-compose down -v
docker rmi marketplace-api-api

# Keep data
docker-compose down
```

## 📊 API Testing

### Quick Tests

```bash
# Test stores
curl http://localhost:4000/stores

# Test products
curl http://localhost:4000/products

# Test specific product
curl http://localhost:4000/products/prod1

# Test store products
curl http://localhost:4000/stores/kofi-fashion/products
```

### Search & Pagination

```bash
# Search products
curl "http://localhost:4000/products?q=ankara"

# Pagination
curl "http://localhost:4000/products?page=1&limit=2"

# Search stores
curl "http://localhost:4000/stores?q=kofi"
```

## 🎯 Development Workflow

1. **Start services**: `docker-compose up -d`
2. **Run migrations**: `docker-compose exec api npx prisma migrate deploy`
3. **Seed data**: `docker-compose exec api npx prisma db seed`
4. **Make changes** (hot reload enabled)
5. **Run tests**: `docker-compose exec api npm test`
6. **View logs**: `docker-compose logs -f api`

## 📝 Environment Variables

**Development** (Docker):

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace
S3_ENDPOINT=http://minio:9000
```

**Local** (if running outside Docker):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace
S3_ENDPOINT=http://localhost:9000
```
