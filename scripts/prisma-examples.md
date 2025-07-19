# Prisma Examples & Usage Scenarios

## 🎯 Common Development Scenarios

### 1. Setting Up a New Feature

```bash
# 1. Start services
docker-compose up -d

# 2. Create new migration for feature
docker-compose exec api npx prisma migrate dev --name add_product_categories

# 3. Generate updated client
docker-compose exec api npx prisma generate

# 4. Seed test data
docker-compose exec api npx prisma db seed

# 5. Open Prisma Studio to verify
docker-compose exec api npx prisma studio --port 5555
```

### 2. Database Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Validate changes
docker-compose exec api npx prisma validate

# 3. Format schema
docker-compose exec api npx prisma format

# 4. Create migration
docker-compose exec api npx prisma migrate dev --name descriptive_name

# 5. Generate client
docker-compose exec api npx prisma generate
```

### 3. Debugging Data Issues

```bash
# 1. Open Prisma Studio
docker-compose exec api npx prisma studio --port 5555

# 2. Browse data visually
# 3. Check relationships
# 4. Export data if needed

# Alternative: Use direct SQL
docker-compose exec api npx prisma db execute --stdin <<< "
SELECT p.name, s.name as store_name
FROM Product p
JOIN Store s ON p.storeId = s.id
WHERE p.visibleMarket = true;
"
```

### 4. Production Database Sync

```bash
# 1. Pull current schema from production
docker-compose exec api npx prisma db pull

# 2. Generate client
docker-compose exec api npx prisma generate

# 3. Validate schema
docker-compose exec api npx prisma validate
```

## 🔍 Prisma Studio Features

### Data Exploration

- **Browse Tables**: Click on any table to view all records
- **Filter Data**: Use the filter bar to search specific records
- **Sort Data**: Click column headers to sort
- **Edit Records**: Double-click cells to edit values
- **Add Records**: Use the "Add record" button

### Relationship Navigation

- **View Relations**: Click on relationship fields to navigate
- **Nested Data**: See related data in expandable sections
- **Foreign Keys**: Easily identify and navigate relationships

### Data Export

- **Export to JSON**: Download table data as JSON
- **Copy Records**: Copy individual records to clipboard
- **Bulk Operations**: Select multiple records for operations

## 📊 Useful SQL Queries

### Check Data Integrity

```sql
-- Check for orphaned products
SELECT p.* FROM Product p
LEFT JOIN Store s ON p.storeId = s.id
WHERE s.id IS NULL;

-- Check for stores without products
SELECT s.* FROM Store s
LEFT JOIN Product p ON s.id = p.storeId
WHERE p.id IS NULL;
```

### Performance Queries

```sql
-- Count products per store
SELECT s.name, COUNT(p.id) as product_count
FROM Store s
LEFT JOIN Product p ON s.id = p.storeId
GROUP BY s.id, s.name;

-- Find stores with most products
SELECT s.name, COUNT(p.id) as product_count
FROM Store s
JOIN Product p ON s.id = p.storeId
GROUP BY s.id, s.name
ORDER BY product_count DESC;
```

## 🛠️ Development Workflow Tips

### 1. Always Validate Schema

```bash
docker-compose exec api npx prisma validate
```

### 2. Use Descriptive Migration Names

```bash
# Good
docker-compose exec api npx prisma migrate dev --name add_user_email_verification

# Bad
docker-compose exec api npx prisma migrate dev --name update
```

### 3. Check Migration Status

```bash
docker-compose exec api npx prisma migrate status
```

### 4. Reset Database When Needed

```bash
# Complete reset with seeding
docker-compose exec api npx prisma migrate reset --force
docker-compose exec api npx prisma db seed
```

### 5. Use Prisma Studio for Data Validation

- Open Prisma Studio after seeding
- Verify data relationships
- Check for data integrity issues
- Export data for testing

## 🚨 Common Issues & Solutions

### Issue: "Prisma client not generated"

```bash
# Solution: Generate client
docker-compose exec api npx prisma generate
```

### Issue: "Schema validation failed"

```bash
# Solution: Validate and format schema
docker-compose exec api npx prisma validate
docker-compose exec api npx prisma format
```

### Issue: "Migration conflicts"

```bash
# Solution: Reset and recreate
docker-compose exec api npx prisma migrate reset --force
docker-compose exec api npx prisma migrate dev --name fresh_start
```

### Issue: "Database connection failed"

```bash
# Solution: Check Docker services
docker-compose ps
docker-compose logs postgres
docker-compose restart postgres
```
