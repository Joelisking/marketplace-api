# Prisma Commands Reference Guide

## 🎯 Quick Overview

This guide explains when to use local vs Docker commands for Prisma operations in your marketplace API project.

## 🔧 Your Current Setup

### Environment Configuration

- **Docker Database URL**: `postgresql://postgres:postgres@postgres:5432/marketplace?schema=public`
- **Local Database URL**: `postgresql://postgres:postgres@localhost:5432/marketplace?schema=public`
- **API Port**: 4000
- **Prisma Studio Port**: 5555

## 📋 Prisma Commands Cheat Sheet

| Task             | Local Command                         | Docker Command                                                             |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Generate client  | `pnpm prisma generate`                | `docker-compose exec api npx prisma generate`                              |
| Create migration | `pnpm prisma migrate dev --name name` | `docker-compose exec api npx prisma migrate dev --name name`               |
| Apply migrations | `pnpm prisma migrate deploy`          | `docker-compose exec api npx prisma migrate deploy`                        |
| Open Studio      | `pnpm prisma studio`                  | `docker-compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555` |
| Seed database    | `pnpm prisma db seed`                 | `docker-compose exec api npx prisma db seed`                               |
| Reset database   | `pnpm prisma migrate reset`           | `docker-compose exec api npx prisma migrate reset`                         |
| Push schema      | `pnpm prisma db push`                 | `docker-compose exec api npx prisma db push`                               |
| Format schema    | `pnpm prisma format`                  | `docker-compose exec api npx prisma format`                                |
| Validate schema  | `pnpm prisma validate`                | `docker-compose exec api npx prisma validate`                              |

## 🗄️ Database Schema & Migrations

### 1. Generate Prisma Client

**What it does:** Creates TypeScript types and database client based on your schema

```bash
# Local (when .env points to localhost)
pnpm prisma generate

# Docker (when .env points to postgres:5432) - RECOMMENDED
docker-compose exec api npx prisma generate
```

**When to use:** After making changes to `schema.prisma` or before running your application

### 2. Create Migration

**What it does:** Creates a new migration file when you change your schema

```bash
# Local
pnpm prisma migrate dev --name add_new_field

# Docker - RECOMMENDED
docker-compose exec api npx prisma migrate dev --name add_new_field
```

**When to use:** After modifying your `schema.prisma` file and want to save those changes

### 3. Apply Migrations

**What it does:** Runs pending migrations to update your database

```bash
# Local
pnpm prisma migrate deploy

# Docker - RECOMMENDED
docker-compose exec api npx prisma migrate deploy
```

**When to use:** In production or when you want to apply existing migrations without creating new ones

### 4. Reset Database

**What it does:** Drops all tables and recreates them (⚠️ DESTROYS ALL DATA)

```bash
# Local
pnpm prisma migrate reset

# Docker - RECOMMENDED
docker-compose exec api npx prisma migrate reset
```

**When to use:** During development when you want to start fresh (WARNING: This deletes all data!)

## 🖥️ Database Management

### 5. Prisma Studio (Database GUI)

**What it does:** Opens a web interface to browse and edit your database

```bash
# Local (if .env has localhost)
pnpm prisma studio

# Docker - RECOMMENDED (uses correct database hostname)
docker-compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
```

**Access:** Open http://localhost:5555 in your browser

### 6. Database Push

**What it does:** Pushes schema changes directly to database (for development)

```bash
# Local
pnpm prisma db push

# Docker - RECOMMENDED
docker-compose exec api npx prisma db push
```

**When to use:** During development when you want to quickly test schema changes without creating migrations

### 7. Seed Database

**What it does:** Runs your seed script to populate database with test data

```bash
# Local
pnpm prisma db seed

# Docker - RECOMMENDED
docker-compose exec api npx prisma db seed
```

**When to use:** After resetting database or setting up a new environment

## 📝 Schema Management

### 8. Format Schema

**What it does:** Formats your `schema.prisma` file nicely

```bash
# Local
pnpm prisma format

# Docker
docker-compose exec api npx prisma format
```

### 9. Validate Schema

**What it does:** Checks if your schema is valid

```bash
# Local
pnpm prisma validate

# Docker
docker-compose exec api npx prisma validate
```

## 🎯 Decision Tree: When to Use What

### Scenario 1: You're Developing Locally

```bash
# 1. Make changes to schema.prisma
# 2. Generate client
pnpm prisma generate

# 3. Create migration
pnpm prisma migrate dev --name descriptive_name

# 4. Start Prisma Studio (if .env has localhost)
pnpm prisma studio
```

### Scenario 2: You're Using Docker (RECOMMENDED)

```bash
# 1. Make changes to schema.prisma
# 2. Generate client
docker-compose exec api npx prisma generate

# 3. Create migration
docker-compose exec api npx prisma migrate dev --name descriptive_name

# 4. Start Prisma Studio
docker-compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
```

### Scenario 3: Production Deployment

```bash
# Only apply existing migrations (don't create new ones)
docker-compose exec api npx prisma migrate deploy

# Generate client for production
docker-compose exec api npx prisma generate
```

## 🚀 Recommended Workflow for Your Project

Since you're using Docker, follow this workflow for consistency:

### Daily Development Flow:

```bash
# 1. Make schema changes in schema.prisma
# 2. Generate client
docker-compose exec api npx prisma generate

# 3. Create migration
docker-compose exec api npx prisma migrate dev --name my_changes

# 4. View data in Studio
docker-compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
# Then open http://localhost:5555 in your browser
```

### When Starting Fresh:

```bash
# 1. Reset database (WARNING: deletes all data)
docker-compose exec api npx prisma migrate reset

# 2. Seed with test data
docker-compose exec api npx prisma db seed

# 3. Open Studio to verify
docker-compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
```

## 🔍 Troubleshooting

### Port Already in Use (5555)

```bash
# Kill any existing Prisma Studio processes
pkill -f "prisma studio"

# Check what's using the port
lsof -i :5555

# Restart Docker containers if needed
docker-compose down
docker-compose up -d
```

### Database Connection Issues

- **Local commands failing**: Make sure your `.env` has `localhost:5432`
- **Docker commands failing**: Make sure your `.env` has `postgres:5432`
- **Studio not loading**: Check if port 5555 is exposed in `docker-compose.yml`

### Migration Issues

```bash
# If migrations are stuck, mark them as applied
docker-compose exec api npx prisma migrate resolve --applied migration_name

# If you need to reset everything
docker-compose exec api npx prisma migrate reset
```

## 💡 Pro Tips

1. **Always use Docker commands** for consistency with your API environment
2. **Keep your .env with `postgres:5432`** (Docker hostname) for the best experience
3. **Use descriptive migration names** like `add_user_role` or `create_product_images`
4. **Test migrations in development** before applying to production
5. **Use Prisma Studio** to verify your data and relationships

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Studio Guide](https://www.prisma.io/docs/concepts/tools-and-interfaces/prisma-studio)

---

**Last Updated:** $(date)
**Project:** Marketplace API
**Environment:** Docker + PostgreSQL
