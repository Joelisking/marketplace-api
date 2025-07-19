# Docker Setup & Instructions

This document provides comprehensive instructions for setting up and running the Marketplace API using Docker.

## 🐳 Overview

The marketplace API is designed to run in a Docker environment with the following services:

- **API Service** - Node.js/Express application
- **PostgreSQL** - Database
- **MinIO** - Object storage for file uploads

## 📋 Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository)
- At least 4GB of available RAM

## 🚀 Quick Start

### 1. Clone and Navigate to Project

```bash
git clone <repository-url>
cd marketplace-api
```

### 2. Environment Configuration

The project includes a `.env.example` file. Copy it to create your `.env`:

```bash
cp .env.example .env
```

**Important**: The `.env` file should contain:

```env
# Database - Use Docker service name
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace?schema=public

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# S3 / MinIO Configuration
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=marketplace

# Application
PORT=4000
```

### 3. Start All Services

```bash
docker-compose up -d
```

This command will:

- Build the API Docker image
- Start PostgreSQL database
- Start MinIO object storage
- Start the API service
- Set up the Docker network

### 4. Run Database Migrations

```bash
docker-compose exec api npx prisma migrate deploy
```

### 5. Seed the Database

```bash
docker-compose exec api npx prisma db seed
```

### 6. Verify Setup

Test the API endpoints:

```bash
# Test stores endpoint
curl http://localhost:4000/stores

# Test products endpoint
curl http://localhost:4000/products

# Test individual product
curl http://localhost:4000/products/prod1
```

## 🛠️ Development Workflow

### Starting Development

```bash
# Start all services in detached mode
docker-compose up -d

# View logs in real-time
docker-compose logs -f api
```

### Running Tests

```bash
# Run all tests
docker-compose exec api npm test

# Run specific test file
docker-compose exec api npm test -- tests/catalogue.test.ts
```

### Database Operations

```bash
# Access Prisma Studio (database GUI)
docker-compose exec api npx prisma studio --port 5555
# Then open http://localhost:5555 in your browser

# Generate Prisma client
docker-compose exec api npx prisma generate

# Create new migration
docker-compose exec api npx prisma migrate dev --name migration_name

# Reset database (⚠️ destroys all data)
docker-compose exec api npx prisma migrate reset

# View database schema
docker-compose exec api npx prisma db pull

# Push schema changes to database
docker-compose exec api npx prisma db push

# Validate schema
docker-compose exec api npx prisma validate

# Format schema file
docker-compose exec api npx prisma format

# Check database connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"

# View migration history
docker-compose exec api npx prisma migrate status

# Reset and seed database
docker-compose exec api npx prisma migrate reset --force
docker-compose exec api npx prisma db seed
```

### Code Changes

The API service uses `ts-node-dev` with hot reloading, so most code changes will automatically restart the service. You can see the restart logs in the Docker logs.

## 🗄️ Prisma Database Management

### Prisma Studio (Database GUI)

Prisma Studio provides a visual interface to manage your database:

```bash
# Start Prisma Studio
docker-compose exec api npx prisma studio --port 5555

# Open in browser: http://localhost:5555
```

**Features:**

- Browse and edit data
- View relationships between tables
- Filter and sort data
- Add, edit, and delete records
- Export data

### Schema Management

```bash
# Validate schema syntax
docker-compose exec api npx prisma validate

# Format schema file
docker-compose exec api npx prisma format

# Generate Prisma client
docker-compose exec api npx prisma generate

# Pull schema from database
docker-compose exec api npx prisma db pull

# Push schema to database (development only)
docker-compose exec api npx prisma db push
```

### Migration Workflow

```bash
# Create new migration
docker-compose exec api npx prisma migrate dev --name descriptive_name

# Apply migrations to production
docker-compose exec api npx prisma migrate deploy

# View migration status
docker-compose exec api npx prisma migrate status

# Reset database (⚠️ destroys all data)
docker-compose exec api npx prisma migrate reset

# Reset and seed in one command
docker-compose exec api npx prisma migrate reset --force
docker-compose exec api npx prisma db seed
```

### Database Operations

```bash
# Check database connection
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"

# Execute custom SQL
docker-compose exec api npx prisma db execute --file ./scripts/custom.sql

# Reset and seed database
docker-compose exec api npx prisma migrate reset --force && docker-compose exec api npx prisma db seed
```

### Development Tips

1. **Always validate schema changes**: `npx prisma validate`
2. **Use descriptive migration names**: `npx prisma migrate dev --name add_user_profile`
3. **Check migration status before deploying**: `npx prisma migrate status`
4. **Use Prisma Studio for data exploration**: Great for debugging and testing
5. **Generate client after schema changes**: `npx prisma generate`

## 📁 Project Structure

```
marketplace-api/
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # API service Docker configuration
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding script
│   └── migrations/            # Database migrations
├── src/
│   ├── controllers/           # API controllers
│   ├── services/              # Business logic
│   ├── routes/                # API routes
│   ├── schema/                # Zod validation schemas
│   └── lib/
│       └── prisma.ts          # Shared Prisma client
└── tests/                     # Test files
```

## 🔧 Docker Services

### API Service (`api`)

- **Port**: 4000
- **Base Image**: Node.js 22
- **Package Manager**: pnpm
- **Hot Reload**: Enabled with ts-node-dev
- **Environment**: Development with TypeScript

### PostgreSQL (`postgres`)

- **Port**: 5432 (internal)
- **Database**: marketplace
- **Username**: postgres
- **Password**: postgres
- **Persistence**: Docker volume `postgres_data`

### MinIO (`minio`)

- **Port**: 9000 (internal)
- **Username**: minio
- **Password**: minio123
- **Persistence**: Docker volume `minio_data`

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using port 4000
lsof -i :4000

# Kill the process or change the port in docker-compose.yml
```

#### 2. Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### 3. API Service Won't Start

```bash
# Check API logs
docker-compose logs api

# Rebuild the API image
docker-compose build api

# Restart the service
docker-compose restart api
```

#### 4. Database Migrations Fail

```bash
# Check if database is accessible
docker-compose exec postgres psql -U postgres -d marketplace

# Reset migrations (⚠️ destroys data)
docker-compose exec api npx prisma migrate reset

# Check Prisma client
docker-compose exec api npx prisma generate

# Validate schema
docker-compose exec api npx prisma validate
```

#### 5. Prisma Studio Won't Start

```bash
# Check if port 5555 is available
lsof -i :5555

# Try different port
docker-compose exec api npx prisma studio --port 5556

# Check Prisma client generation
docker-compose exec api npx prisma generate
```

#### 6. Schema Validation Errors

```bash
# Validate schema
docker-compose exec api npx prisma validate

# Format schema
docker-compose exec api npx prisma format

# Check for syntax errors in schema.prisma
docker-compose exec api npx prisma validate --schema=./prisma/schema.prisma
```

### Useful Commands

```bash
# View all container status
docker-compose ps

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs api
docker-compose logs postgres
docker-compose logs minio

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ destroys data)
docker-compose down -v

# Rebuild all images
docker-compose build --no-cache

# Access container shell
docker-compose exec api sh
docker-compose exec postgres psql -U postgres -d marketplace
```

## 🔄 Environment Variables

### Development vs Production

For local development, the current setup uses:

- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace`
- `S3_ENDPOINT=http://minio:9000`

For production deployment, you would change these to:

- `DATABASE_URL=postgresql://user:pass@your-db-host:5432/marketplace`
- `S3_ENDPOINT=https://your-s3-endpoint.com`

### Security Notes

- Change default passwords in production
- Use strong JWT secrets
- Enable HTTPS in production
- Configure proper CORS settings

## 📊 Monitoring

### Health Checks

```bash
# API health
curl http://localhost:4000/health

# Database connectivity
docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"
```

### Performance Monitoring

```bash
# View container resource usage
docker stats

# View API logs with timestamps
docker-compose logs -f --timestamps api
```

## 🧹 Cleanup

### Remove Everything

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove Docker images
docker rmi marketplace-api-api
```

### Keep Data

```bash
# Stop containers but keep volumes
docker-compose down

# Start again with existing data
docker-compose up -d
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [MinIO Documentation](https://docs.min.io/)

## 🤝 Contributing

When contributing to this project:

1. Always test changes in the Docker environment
2. Update this documentation if you change the Docker setup
3. Ensure all tests pass: `docker-compose exec api npm test`
4. Follow the existing code style and patterns

---

**Note**: This setup is optimized for development. For production deployment, additional security measures, environment-specific configurations, and monitoring should be implemented.
