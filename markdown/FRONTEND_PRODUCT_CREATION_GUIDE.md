# Frontend Product Creation Guide

This guide provides comprehensive instructions for implementing product creation functionality in the frontend application.

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Prerequisites](#prerequisites)
3. [Product Creation Flow](#product-creation-flow)
4. [API Endpoints](#api-endpoints)
5. [Image Upload Process](#image-upload-process)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Example Implementation](#example-implementation)

## Authentication Requirements

Before creating products, users must:

1. **Register/Login**: Obtain an access token
2. **Become a Vendor**: Apply and get approved as a vendor
3. **Create a Store**: Own a store to create products

### Required Headers

```javascript
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};
```

## Prerequisites

### 1. User Authentication

```javascript
// Login to get access token
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'vendor@example.com',
    password: 'password123',
  }),
});

const { accessToken } = await loginResponse.json();
```

### 2. Vendor Status Check

```javascript
// Check if user is a vendor
const userResponse = await fetch('/auth/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

const user = await userResponse.json();
if (user.role !== 'VENDOR') {
  throw new Error('Vendor role required');
}
```

### 3. Store Creation (if needed)

```javascript
// Create store if user doesn't have one
const storeResponse = await fetch('/stores', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Store',
    description: 'Store description',
    slug: 'my-store',
  }),
});

const store = await storeResponse.json();
```

## Product Creation Flow

### Step 1: Upload Images (Optional but Recommended)

Before creating a product, upload images to get their URLs:

```javascript
async function uploadProductImages(files) {
  const uploadedImages = [];

  for (const file of files) {
    // 1. Get presigned URL
    const presignedResponse = await fetch('/upload/presigned-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    const { uploadUrl, fileUrl, fileName } = await presignedResponse.json();

    // 2. Upload file to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    uploadedImages.push({
      fileName,
      fileUrl,
      altText: file.name,
      isPrimary: uploadedImages.length === 0, // First image is primary
      sortOrder: uploadedImages.length,
    });
  }

  return uploadedImages;
}
```

### Step 2: Create Product

```javascript
async function createProduct(productData, images = []) {
  const response = await fetch('/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: productData.name,
      price: productData.price,
      stock: productData.stock,
      visibleMarket: productData.visibleMarket ?? true,
      images: images,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

## API Endpoints

### 1. Product Creation

- **POST** `/products`
- **Authentication**: Required (Bearer token)
- **Role**: Vendor only
- **Body**: Product data with optional images

### 2. Product Update

- **PUT** `/products/{id}`
- **Authentication**: Required (Bearer token)
- **Role**: Product owner only

### 3. Product Deletion

- **DELETE** `/products/{id}`
- **Authentication**: Required (Bearer token)
- **Role**: Product owner only

### 4. Image Management

- **POST** `/vendor/products/{productId}/images` - Add images
- **GET** `/vendor/products/{productId}/images` - Get images
- **PUT** `/vendor/products/{productId}/images/{imageId}` - Update image
- **DELETE** `/vendor/products/{productId}/images/{imageId}` - Delete image
- **PUT** `/vendor/products/{productId}/images/reorder` - Reorder images

### 5. Upload Endpoints

- **POST** `/upload/presigned-url` - Get upload URL
- **DELETE** `/upload/delete` - Delete uploaded file

## Image Upload Process

### Detailed Image Upload Flow

```javascript
class ProductImageUploader {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async uploadImage(file) {
    try {
      // Validate file
      this.validateFile(file);

      // Get presigned URL
      const presignedData = await this.getPresignedUrl(file);

      // Upload to S3
      await this.uploadToS3(presignedData.uploadUrl, file);

      return {
        fileName: presignedData.fileName,
        fileUrl: presignedData.fileUrl,
        altText: file.name,
        isPrimary: false,
        sortOrder: 0,
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  validateFile(file) {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error('File size must be less than 10MB');
    }
  }

  async getPresignedUrl(file) {
    const response = await fetch('/upload/presigned-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    return await response.json();
  }

  async uploadToS3(uploadUrl, file) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }
  }
}
```

## Error Handling

### Common Error Responses

```javascript
const errorHandlers = {
  401: 'Authentication required. Please log in again.',
  403: 'Vendor role required. You must be a vendor to create products.',
  404: 'Product not found or access denied.',
  409: 'Store slug already exists.',
  422: 'Validation error. Please check your input data.',
  500: 'Server error. Please try again later.',
};

function handleApiError(response) {
  const status = response.status;
  const errorMessage = errorHandlers[status] || 'An unexpected error occurred';

  if (status === 401) {
    // Redirect to login
    window.location.href = '/login';
  }

  throw new Error(errorMessage);
}
```

### Validation Errors

```javascript
async function validateProductData(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!data.price || data.price < 0) {
    errors.push('Price must be a positive number');
  }

  if (!data.stock || data.stock < 0) {
    errors.push('Stock must be a positive number');
  }

  if (data.images && data.images.length > 0) {
    for (const image of data.images) {
      if (!image.fileName || !image.fileUrl) {
        errors.push('Image must have fileName and fileUrl');
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}
```

## Best Practices

### 1. Image Optimization

```javascript
// Compress images before upload
async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
}
```

### 2. Progressive Enhancement

```javascript
// Create product with or without images
async function createProductWithFallback(productData, images = []) {
  try {
    // Try to create with images first
    return await createProduct(productData, images);
  } catch (error) {
    if (error.message.includes('image')) {
      // Fallback: create without images
      console.warn('Image upload failed, creating product without images');
      return await createProduct(productData, []);
    }
    throw error;
  }
}
```

### 3. Loading States

```javascript
class ProductCreationManager {
  constructor() {
    this.isUploading = false;
    this.isCreating = false;
  }

  async createProductWithProgress(productData, files, onProgress) {
    this.isUploading = true;
    onProgress('Uploading images...', 0);

    try {
      // Upload images with progress
      const images = await this.uploadImagesWithProgress(files, onProgress);

      this.isUploading = false;
      this.isCreating = true;
      onProgress('Creating product...', 90);

      // Create product
      const product = await createProduct(productData, images);

      onProgress('Product created successfully!', 100);
      return product;
    } catch (error) {
      this.isUploading = false;
      this.isCreating = false;
      throw error;
    }
  }

  async uploadImagesWithProgress(files, onProgress) {
    const images = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const progress = (i / totalFiles) * 80; // 80% for uploads
      onProgress(`Uploading image ${i + 1}/${totalFiles}...`, progress);

      const image = await uploadProductImages([files[i]]);
      images.push(...image);
    }

    return images;
  }
}
```

## Example Implementation

### Complete Product Creation Component

```javascript
class ProductCreationForm {
  constructor(container, accessToken) {
    this.container = container;
    this.accessToken = accessToken;
    this.uploader = new ProductImageUploader(accessToken);
    this.manager = new ProductCreationManager();
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <form id="product-form">
        <div class="form-group">
          <label for="name">Product Name *</label>
          <input type="text" id="name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="price">Price (in pesewas) *</label>
          <input type="number" id="price" name="price" min="0" required>
        </div>
        
        <div class="form-group">
          <label for="stock">Stock Quantity *</label>
          <input type="number" id="stock" name="stock" min="0" required>
        </div>
        
        <div class="form-group">
          <label for="visibleMarket">
            <input type="checkbox" id="visibleMarket" name="visibleMarket" checked>
            Visible in marketplace
          </label>
        </div>
        
        <div class="form-group">
          <label for="images">Product Images</label>
          <input type="file" id="images" name="images" multiple accept="image/*">
          <div id="image-preview"></div>
        </div>
        
        <button type="submit" id="submit-btn">Create Product</button>
        <div id="progress" style="display: none;"></div>
      </form>
    `;
  }

  bindEvents() {
    const form = this.container.querySelector('#product-form');
    const imageInput = this.container.querySelector('#images');

    form.addEventListener('submit', this.handleSubmit.bind(this));
    imageInput.addEventListener('change', this.handleImageSelect.bind(this));
  }

  async handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const productData = {
      name: formData.get('name'),
      price: parseInt(formData.get('price')),
      stock: parseInt(formData.get('stock')),
      visibleMarket: formData.get('visibleMarket') === 'on',
    };

    const files = Array.from(this.container.querySelector('#images').files);

    try {
      await this.validateProductData(productData);

      const product = await this.manager.createProductWithProgress(
        productData,
        files,
        this.updateProgress.bind(this),
      );

      this.showSuccess('Product created successfully!', product);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleImageSelect(event) {
    const files = Array.from(event.target.files);
    const preview = this.container.querySelector('#image-preview');

    preview.innerHTML = '';

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'cover';
        img.style.margin = '5px';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }

  updateProgress(message, percentage) {
    const progress = this.container.querySelector('#progress');
    progress.style.display = 'block';
    progress.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <p>${message}</p>
    `;
  }

  showSuccess(message, product) {
    this.container.innerHTML = `
      <div class="success-message">
        <h3>✅ ${message}</h3>
        <p>Product ID: ${product.id}</p>
        <a href="/products/${product.id}" class="btn">View Product</a>
      </div>
    `;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }
}

// Usage
const container = document.getElementById('product-creation');
const form = new ProductCreationForm(container, accessToken);
```

### React Component Example

```jsx
import React, { useState } from 'react';

const ProductCreationForm = ({ accessToken }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    visibleMarket: true,
  });
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ message: '', percentage: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload images first
      const uploadedImages = await uploadImages(images, accessToken, setProgress);

      // Create product
      setProgress({ message: 'Creating product...', percentage: 90 });
      const product = await createProduct(formData, uploadedImages, accessToken);

      setProgress({ message: 'Product created successfully!', percentage: 100 });
      // Handle success (redirect, show message, etc.)
    } catch (error) {
      console.error('Product creation failed:', error);
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Price (in pesewas)"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        min="0"
        required
      />

      <input
        type="number"
        placeholder="Stock Quantity"
        value={formData.stock}
        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
        min="0"
        required
      />

      <label>
        <input
          type="checkbox"
          checked={formData.visibleMarket}
          onChange={(e) => setFormData({ ...formData, visibleMarket: e.target.checked })}
        />
        Visible in marketplace
      </label>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setImages(Array.from(e.target.files))}
      />

      {isSubmitting && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress.percentage}%` }} />
          <p>{progress.message}</p>
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
};
```

## Testing

### Test Product Creation

```javascript
// Test script for product creation
async function testProductCreation() {
  const testData = {
    name: 'Test Product',
    price: 2500, // 25 GHS in pesewas
    stock: 10,
    visibleMarket: true,
  };

  try {
    // Test without images
    const product1 = await createProduct(testData, []);
    console.log('Product created without images:', product1);

    // Test with images (if you have test images)
    const testImages = [
      {
        fileName: 'test-image-1.jpg',
        fileUrl: 'https://example.com/test-image-1.jpg',
        altText: 'Test Image 1',
        isPrimary: true,
        sortOrder: 0,
      },
    ];

    const product2 = await createProduct(testData, testImages);
    console.log('Product created with images:', product2);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if access token is valid and not expired
2. **403 Forbidden**: Ensure user has vendor role and owns a store
3. **Image upload fails**: Check file size (max 10MB) and format (images only)
4. **Validation errors**: Ensure all required fields are provided with correct types

### Debug Tips

```javascript
// Enable detailed logging
const DEBUG = true;

function logApiCall(endpoint, data) {
  if (DEBUG) {
    console.log(`API Call: ${endpoint}`, data);
  }
}

// Add to your API calls
logApiCall('/products', productData);
```

This guide covers all aspects of product creation in the marketplace API. Follow these patterns to implement a robust product creation system in your frontend application.
