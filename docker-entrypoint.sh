#!/bin/bash
set -e

echo "Running database migrations..."
pnpm prisma migrate deploy

# Check if SEED_DATABASE is set to true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  pnpm seed
fi

echo "Starting application..."
pnpm dev
