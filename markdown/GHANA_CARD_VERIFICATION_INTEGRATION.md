# Ghana Card Verification Integration Guide

## Overview

This document describes the integration of external APIs for Ghana Card verification in the marketplace platform. The system supports multiple verification methods including official NIA API, OCR services, and fallback simulation mode.

## 🔧 **External API Integration**

### **1. NIA (National Identification Authority) API**

The primary verification method uses Ghana's official National Identification Authority API.

#### **Configuration**

```env
NIA_API_KEY=your_nia_api_key_here
NIA_API_URL=https://api.nia.gov.gh/v1
```

#### **API Endpoint**

```
POST https://api.nia.gov.gh/v1/verify
```

#### **Request Format**

```json
{
  "cardNumber": "GHA-123456789-X",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "verificationType": "FULL_VERIFICATION"
}
```

#### **Response Format**

```json
{
  "status": "VERIFIED",
  "message": "Verification completed",
  "data": {
    "cardNumber": "GHA-123456789-X",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "verificationStatus": "VERIFIED"
  }
}
```

### **2. Google Cloud Vision API (OCR)**

For image-based verification, the system integrates with Google Cloud Vision API for OCR processing.

#### **Configuration**

```env
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here
```

#### **API Endpoint**

```
POST https://vision.googleapis.com/v1/images:annotate?key={API_KEY}
```

#### **Request Format**

```json
{
  "requests": [
    {
      "image": {
        "source": {
          "imageUri": "https://example.com/ghana-card-image.jpg"
        }
      },
      "features": [
        {
          "type": "TEXT_DETECTION",
          "maxResults": 1
        }
      ]
    }
  ]
}
```

#### **OCR Text Processing**

The system extracts Ghana Card information from OCR text using regex patterns:

- **Card Number**: `GHA-\d{9}-[A-Z]`
- **Names**: `([A-Z][a-z]+)\s+([A-Z][a-z]+)`
- **Date of Birth**: `(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})`

### **3. AWS Textract (Alternative OCR)**

As an alternative to Google Vision, AWS Textract can be used for OCR processing.

#### **Configuration**

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
```

#### **Features**

- Document text extraction
- Form data extraction
- Table data extraction
- High accuracy for structured documents

## 🚀 **Implementation Details**

### **Service Architecture**

```typescript
// Primary verification with NIA API
async function verifyWithNIA(ghanaCardNumber, firstName, lastName, dateOfBirth);

// OCR verification with Google Vision
async function verifyWithGoogleVision(imageUrl);

// OCR verification with AWS Textract
async function verifyWithAWSTextract(imageUrl);

// Main verification function with fallback
async function verifyGhanaCardDocument(
  ghanaCardNumber,
  firstName,
  lastName,
  dateOfBirth,
  imageUrl?,
);
```

### **Verification Flow**

1. **Format Validation**: Validate Ghana Card number format (`GHA-123456789-X`)
2. **Duplicate Check**: Check if Ghana Card is already registered
3. **Primary Verification**: Attempt NIA API verification
4. **OCR Verification**: If image provided, attempt OCR verification
5. **Fallback**: If no external APIs configured, use simulation mode
6. **Result Aggregation**: Combine results from multiple verification methods

### **Verification Methods Priority**

1. **NIA API** (Highest priority - official verification)
2. **Google Vision OCR** (Image-based verification)
3. **AWS Textract OCR** (Alternative image-based verification)
4. **Simulation Mode** (Development/testing fallback)

## 📋 **API Endpoints**

### **1. Verify Ghana Card**

```http
POST /api/ghana-card/verify
```

**Request Body:**

```json
{
  "ghanaCardNumber": "GHA-123456789-X",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "imageUrl": "https://example.com/ghana-card.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Ghana Card verified successfully via NIA API",
  "data": {
    "verification": {
      "isValid": true,
      "verificationStatus": "VERIFIED",
      "message": "Ghana Card verified successfully via NIA API",
      "verificationMethods": ["NIA_API"],
      "verificationData": {
        "cardNumber": "GHA-123456789-X",
        "verifiedAt": "2024-01-15T10:30:00Z",
        "verificationMethod": "NIA_API"
      }
    },
    "report": {
      "reportId": "GHA-1705312200000",
      "verificationDate": "2024-01-15T10:30:00Z",
      "status": "VERIFIED",
      "verificationMethods": ["NIA_API"]
    }
  }
}
```

### **2. Validate Ghana Card Image**

```http
POST /api/ghana-card/validate-image
```

**Request Body:**

```json
{
  "imageUrl": "https://example.com/ghana-card.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Ghana Card information extracted successfully",
  "data": {
    "isValid": true,
    "confidence": 0.85,
    "extractedData": {
      "cardNumber": "GHA-123456789-X",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01"
    },
    "verificationMethod": "GOOGLE_VISION_OCR"
  }
}
```

### **3. Check Ghana Card Format**

```http
GET /api/ghana-card/validate-format/{ghanaCardNumber}
```

**Response:**

```json
{
  "success": true,
  "message": "Ghana Card number format is valid",
  "data": {
    "ghanaCardNumber": "GHA-123456789-X",
    "isValid": true
  }
}
```

### **4. Check Ghana Card Availability**

```http
GET /api/ghana-card/availability/{ghanaCardNumber}
```

**Response:**

```json
{
  "success": true,
  "message": "Ghana Card number is available",
  "data": {
    "ghanaCardNumber": "GHA-123456789-X",
    "isAvailable": true,
    "isDuplicate": false
  }
}
```

### **5. Get Verification Service Status**

```http
GET /api/ghana-card/status
```

**Response:**

```json
{
  "success": true,
  "message": "Verification service status retrieved successfully",
  "data": {
    "niaApi": true,
    "googleVision": true,
    "awsTextract": false,
    "message": "Verification services: NIA API, Google Vision OCR"
  }
}
```

## 🔒 **Security & Error Handling**

### **Error Handling**

- **API Timeouts**: 30-second timeout for external API calls
- **Rate Limiting**: Respect API rate limits
- **Fallback Mode**: Graceful degradation to simulation mode
- **Error Logging**: Comprehensive error logging for debugging

### **Security Measures**

- **API Key Management**: Environment variable configuration
- **Input Validation**: Zod schema validation for all inputs
- **Duplicate Prevention**: Check for existing Ghana Card numbers
- **Data Encryption**: Secure transmission of sensitive data

### **Error Responses**

```json
{
  "success": false,
  "message": "NIA API connection failed: Network timeout",
  "error": "Network timeout"
}
```

## 🧪 **Testing & Development**

### **Simulation Mode**

When no external APIs are configured, the system uses simulation mode:

- **90% Success Rate**: Simulates realistic verification success
- **Random Delays**: Simulates API processing time
- **Format Validation**: Still validates Ghana Card number format
- **Duplicate Checking**: Still checks for existing registrations

### **Test Ghana Card Numbers**

For testing purposes, use these format-valid numbers:

- `GHA-123456789-A`
- `GHA-987654321-Z`
- `GHA-555666777-X`

### **Testing Commands**

```bash
# Test verification with NIA API
curl -X POST http://localhost:4000/api/ghana-card/verify \
  -H "Content-Type: application/json" \
  -d '{
    "ghanaCardNumber": "GHA-123456789-X",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01"
  }'

# Test image validation
curl -X POST http://localhost:4000/api/ghana-card/validate-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/ghana-card.jpg"
  }'

# Check service status
curl http://localhost:4000/api/ghana-card/status
```

## 🔧 **Setup Instructions**

### **1. Environment Configuration**

Add these variables to your `.env` file:

```env
# Ghana Card Verification APIs
NIA_API_KEY=your_nia_api_key_here
NIA_API_URL=https://api.nia.gov.gh/v1

# OCR Services
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
```

### **2. API Key Setup**

#### **NIA API Key**

1. Contact Ghana's National Identification Authority
2. Apply for API access credentials
3. Receive API key and documentation
4. Configure webhook endpoints if required

#### **Google Cloud Vision API**

1. Create Google Cloud project
2. Enable Vision API
3. Create service account
4. Generate API key
5. Set up billing

#### **AWS Textract**

1. Create AWS account
2. Create IAM user with Textract permissions
3. Generate access keys
4. Configure AWS region

### **3. Service Registration**

The Ghana Card verification routes are automatically registered in `src/index.ts`:

```typescript
app.use('/api/ghana-card', ghanaCardVerificationRoutes);
```

## 📊 **Monitoring & Analytics**

### **Verification Metrics**

- **Success Rate**: Percentage of successful verifications
- **Response Time**: Average API response time
- **Error Rate**: Percentage of failed verifications
- **Method Usage**: Which verification methods are most used

### **Logging**

```typescript
// Log verification attempts
console.log('Ghana Card verification attempt:', {
  cardNumber: ghanaCardNumber,
  method: 'NIA_API',
  success: true,
  responseTime: 1200,
});
```

## 🚀 **Production Deployment**

### **1. API Key Management**

- Use environment variables for all API keys
- Rotate API keys regularly
- Monitor API usage and costs
- Set up alerts for API failures

### **2. Performance Optimization**

- Implement caching for verification results
- Use connection pooling for API calls
- Monitor response times
- Set appropriate timeouts

### **3. Monitoring**

- Set up health checks for verification services
- Monitor API rate limits
- Track verification success rates
- Alert on service failures

## 🔮 **Future Enhancements**

### **Planned Features**

1. **Biometric Verification**: Integration with biometric verification services
2. **Real-time Verification**: WebSocket-based real-time verification updates
3. **Batch Processing**: Bulk verification for multiple Ghana Cards
4. **Advanced OCR**: Machine learning-based document analysis
5. **Verification History**: Complete audit trail of verification attempts
6. **Mobile SDK**: Native mobile verification capabilities

### **Integration Opportunities**

- **Banking APIs**: Integration with bank verification systems
- **Government APIs**: Additional government verification services
- **Third-party Services**: Integration with identity verification providers
- **Blockchain**: Decentralized identity verification

## 📞 **Support & Troubleshooting**

### **Common Issues**

1. **API Key Invalid**: Check API key configuration
2. **Network Timeout**: Increase timeout values or check network connectivity
3. **Rate Limit Exceeded**: Implement rate limiting or upgrade API plan
4. **Image Quality**: Ensure uploaded images are clear and complete

### **Debug Mode**

Enable debug logging by setting:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### **Contact Information**

For technical support or API access:

- **NIA API**: Contact National Identification Authority
- **Google Vision**: Google Cloud Support
- **AWS Textract**: AWS Support

---

This integration provides a robust, multi-layered approach to Ghana Card verification, ensuring both accuracy and reliability for the marketplace platform.
