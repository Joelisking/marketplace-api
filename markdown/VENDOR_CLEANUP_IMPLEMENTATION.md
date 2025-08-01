# Vendor Cleanup Implementation

## Overview

This implementation provides comprehensive cleanup functionality for vendor onboarding documents and applications, ensuring that both database records and cloud storage files are properly managed.

## Features Implemented

### 1. Document Deletion

- **Function**: `deleteBusinessDocument(userId, documentId)`
- **Purpose**: Deletes a specific document from both database and cloud storage
- **Security**: Verifies document ownership before deletion
- **Error Handling**: Continues with database deletion even if cloud storage deletion fails

### 2. Application Cleanup

- **Function**: `cleanupVendorApplication(applicationId)`
- **Purpose**: Deletes an entire vendor application and all associated documents
- **Process**:
  1. Fetches all documents for the application
  2. Deletes each file from cloud storage
  3. Deletes the application (cascade deletes documents from database)

### 3. Orphaned Document Cleanup

- **Function**: `cleanupOrphanedApplications()`
- **Purpose**: Finds and cleans up orphaned documents and failed applications
- **Targets**:
  - Documents without corresponding applications
  - Failed applications (PENDING status for >24 hours with no documents)

### 4. Admin Cleanup Endpoints

- **POST** `/vendor-onboarding/admin/cleanup/orphaned` - Cleanup all orphaned data
- **DELETE** `/vendor-onboarding/admin/applications/:applicationId/cleanup` - Cleanup specific application

## API Endpoints

### User Endpoints

#### Delete Document

```http
DELETE /vendor-onboarding/documents/:documentId
Authorization: Bearer <user-token>
```

**Response**:

```json
{
  "message": "Business document deleted successfully"
}
```

### Admin Endpoints

#### Cleanup Orphaned Data

```http
POST /vendor-onboarding/admin/cleanup/orphaned
Authorization: Bearer <admin-token>
```

**Response**:

```json
{
  "message": "Cleanup completed successfully",
  "cleanedApplications": 2,
  "cleanedDocuments": 5,
  "errors": []
}
```

#### Cleanup Specific Application

```http
DELETE /vendor-onboarding/admin/applications/:applicationId/cleanup
Authorization: Bearer <admin-token>
```

**Response**:

```json
{
  "message": "Vendor application cleaned up successfully"
}
```

## Database Schema

The implementation leverages the existing database relationships:

```prisma
model VendorApplication {
  id                String             @id @default(cuid())
  // ... other fields
  businessDocuments VendorDocument[]
  // ... other relations
}

model VendorDocument {
  id            String             @id @default(cuid())
  applicationId String
  application   VendorApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  // ... other fields
}
```

## Error Handling

### Cloud Storage Failures

- If cloud storage deletion fails, the process continues with database cleanup
- Errors are logged but don't prevent the overall cleanup process
- This ensures database consistency even if cloud storage is temporarily unavailable

### Database Failures

- Database operations are wrapped in proper error handling
- Specific error messages are returned for different failure scenarios
- Rollback mechanisms prevent partial cleanup states

## Security Considerations

### Authorization

- Document deletion requires ownership verification
- Admin endpoints require admin privileges
- All operations are logged for audit purposes

### Data Integrity

- Cascade deletes ensure database consistency
- Orphaned document detection prevents data leaks
- Failed application cleanup prevents resource waste

## Usage Examples

### Manual Document Deletion

```typescript
// User deletes their own document
await deleteBusinessDocument(userId, documentId);
```

### Admin Cleanup Operations

```typescript
// Cleanup all orphaned data
const result = await cleanupOrphanedApplications();
console.log(
  `Cleaned ${result.cleanedDocuments} documents and ${result.cleanedApplications} applications`,
);

// Cleanup specific application
await cleanupVendorApplicationById(applicationId);
```

### Automated Cleanup

```typescript
// Can be scheduled as a cron job
setInterval(
  async () => {
    try {
      await cleanupOrphanedApplications();
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  },
  24 * 60 * 60 * 1000,
); // Daily
```

## Benefits

1. **Storage Optimization**: Prevents cloud storage bloat from orphaned files
2. **Data Consistency**: Ensures database and cloud storage stay in sync
3. **Resource Management**: Automatically cleans up failed applications
4. **Admin Control**: Provides manual cleanup tools for administrators
5. **Error Resilience**: Continues operation even when individual operations fail

## Future Enhancements

1. **Scheduled Cleanup**: Automate orphaned data cleanup
2. **Metrics Dashboard**: Track cleanup statistics
3. **Selective Cleanup**: Allow cleanup by date ranges or status
4. **Backup Verification**: Ensure important documents aren't accidentally deleted
5. **Notification System**: Alert admins of cleanup activities
