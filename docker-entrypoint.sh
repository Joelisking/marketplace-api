#!/bin/bash
set -e

echo "🚀 Starting Marketplace API with Phase 1 enhancements..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h postgres -U postgres -d marketplace; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm prisma generate

# Push database schema
echo "🗄️ Pushing database schema..."
pnpm prisma db push

# Run database migrations if any
echo "🔄 Running database migrations..."
pnpm prisma migrate deploy

# Seed database if needed (optional)
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  pnpm seed
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
pnpm build

# Start the application
echo "🚀 Starting application..."
exec pnpm dev 