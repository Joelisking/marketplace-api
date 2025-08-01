# Global Error Handling Guide

This guide explains how to apply consistent, user-friendly error handling across all controllers in the marketplace API.

## Overview

The global error handling system provides:

- **Consistent error messages** across all endpoints
- **User-friendly validation errors** instead of raw Zod errors
- **Automatic error logging** and proper HTTP status codes
- **Centralized error handling** to reduce code duplication

## Components

### 1. Global Error Handler (`src/middlewares/error-handler.ts`)

- Handles Zod validation errors with user-friendly messages
- Processes Prisma database errors
- Manages JWT authentication errors
- Provides consistent error response format

### 2. Validation Error Utility (`src/utils/validation-errors.ts`)

- Converts raw Zod errors to user-friendly messages
- Provides field-specific error messages
- Handles common validation scenarios

### 3. Async Handler Wrapper

- Wraps controller functions to catch async errors
- Automatically passes errors to the global error handler
- Eliminates need for try-catch blocks in controllers

## How to Apply to Controllers

### Step 1: Import Required Dependencies

```typescript
import { asyncHandler, createError } from '../middlewares/error-handler';
```

### Step 2: Convert Functions to Use asyncHandler

**Before:**

```typescript
export async function someFunction(req: Request, res: Response) {
  try {
    // Your logic here
    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({
      message: (error as Error).message || 'Failed to process request',
    });
  }
}
```

**After:**

```typescript
export const someFunction = asyncHandler(async (req: Request, res: Response) => {
  // Your logic here
  res.json({ message: 'Success' });
});
```

### Step 3: Replace Manual Error Responses with createError

**Before:**

```typescript
if (!user) {
  return res.status(404).json({ message: 'User not found' });
}
```

**After:**

```typescript
if (!user) {
  throw createError('User not found', 404);
}
```

## Error Response Format

### Success Response

```json
{
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Single Validation Error

```json
{
  "message": "Please enter a valid email address"
}
```

### Multiple Validation Errors

```json
{
  "message": "Please fix the following 3 errors:",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    },
    {
      "field": "ghanaCardNumber",
      "message": "Ghana Card number must be in format: GHA-123456789-X"
    }
  ]
}
```

### Custom Error

```json
{
  "message": "User not found"
}
```

## Controllers to Update

The following controllers should be updated to use the global error handling pattern:

### ✅ Already Updated

- `vendor-onboarding.controller.ts` - Fully updated
- `auth.controller.ts` - Partially updated (register function)

### 🔄 Needs Update

- `admin-vendor-onboarding.controller.ts`
- `ghana-card-verification.controller.ts`
- `vendor-analytics.controller.ts`
- `customer.controller.ts`
- `notification.controller.ts`
- `customer-dashboard.controller.ts`
- `order.controller.ts`
- `cart.controller.ts`
- `enhanced-upload.controller.ts`
- `vendor.controller.ts`
- `upload.controller.ts`
- `product.controller.ts`
- `product-image.controller.ts`
- `store.controller.ts`
- `analytics.controller.ts`

## Benefits

1. **Consistency**: All endpoints return errors in the same format
2. **User Experience**: Clear, actionable error messages
3. **Maintainability**: Centralized error handling logic
4. **Reduced Code**: No more try-catch blocks in every controller
5. **Better Logging**: Automatic error logging with context
6. **Type Safety**: Proper TypeScript support for error handling

## Example: Complete Controller Update

**Before:**

```typescript
export async function createProduct(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const productData = ProductSchema.parse(req.body);

    const product = await createProductService(userId, productData);

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.issues,
      });
    }
    res.status(400).json({
      message: (error as Error).message || 'Failed to create product',
    });
  }
}
```

**After:**

```typescript
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const productData = ProductSchema.parse(req.body);

  const product = await createProductService(userId, productData);

  res.status(201).json({
    message: 'Product created successfully',
    product,
  });
});
```

## Migration Checklist

For each controller:

- [ ] Import `asyncHandler` and `createError`
- [ ] Convert async functions to use `asyncHandler`
- [ ] Replace manual error responses with `createError`
- [ ] Remove try-catch blocks
- [ ] Test error scenarios
- [ ] Verify error message clarity

## Testing Error Handling

Test the following scenarios:

1. **Validation Errors**: Submit invalid data to see user-friendly messages
2. **Authentication Errors**: Use invalid tokens
3. **Database Errors**: Try to create duplicate records
4. **Custom Errors**: Test business logic error conditions

The global error handler will automatically provide appropriate responses for all these scenarios.
