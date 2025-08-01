#!/usr/bin/env node

/**
 * Ghana Card Verification Test Script
 *
 * This script demonstrates the Ghana Card verification integration
 * with external APIs and fallback simulation mode.
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

// Test data
const testGhanaCards = [
  {
    ghanaCardNumber: 'GHA-123456789-X',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
  },
  {
    ghanaCardNumber: 'GHA-987654321-Z',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1985-05-15',
  },
  {
    ghanaCardNumber: 'GHA-555666777-A',
    firstName: 'Kwame',
    lastName: 'Mensah',
    dateOfBirth: '1992-12-25',
  },
];

const testImageUrl = 'https://example.com/ghana-card-sample.jpg';

/**
 * Test Ghana Card verification
 */
async function testGhanaCardVerification() {
  console.log('🧪 Testing Ghana Card Verification Integration\n');

  // Test 1: Check service status
  console.log('1️⃣ Checking verification service status...');
  try {
    const statusResponse = await fetch(`${API_BASE_URL}/api/ghana-card/status`);
    const statusData = await statusResponse.json();

    if (statusData.success) {
      console.log('✅ Service Status:', statusData.data.message);
      console.log('   - NIA API:', statusData.data.niaApi ? '✅ Configured' : '❌ Not configured');
      console.log(
        '   - Google Vision:',
        statusData.data.googleVision ? '✅ Configured' : '❌ Not configured',
      );
      console.log(
        '   - AWS Textract:',
        statusData.data.awsTextract ? '✅ Configured' : '❌ Not configured',
      );
    } else {
      console.log('❌ Failed to get service status:', statusData.message);
    }
  } catch (error) {
    console.log('❌ Error checking service status:', error.message);
  }

  console.log('\n2️⃣ Testing Ghana Card format validation...');

  // Test 2: Format validation
  for (const card of testGhanaCards) {
    try {
      const formatResponse = await fetch(
        `${API_BASE_URL}/api/ghana-card/validate-format/${card.ghanaCardNumber}`,
      );
      const formatData = await formatResponse.json();

      if (formatData.success) {
        console.log(`✅ ${card.ghanaCardNumber}: Valid format`);
      } else {
        console.log(`❌ ${card.ghanaCardNumber}: Invalid format`);
      }
    } catch (error) {
      console.log(`❌ Error validating ${card.ghanaCardNumber}:`, error.message);
    }
  }

  console.log('\n3️⃣ Testing Ghana Card availability check...');

  // Test 3: Availability check
  for (const card of testGhanaCards) {
    try {
      const availabilityResponse = await fetch(
        `${API_BASE_URL}/api/ghana-card/availability/${card.ghanaCardNumber}`,
      );
      const availabilityData = await availabilityResponse.json();

      if (availabilityData.success) {
        const status = availabilityData.data.isAvailable ? '✅ Available' : '❌ Already registered';
        console.log(`   ${card.ghanaCardNumber}: ${status}`);
      } else {
        console.log(`❌ Error checking ${card.ghanaCardNumber}:`, availabilityData.message);
      }
    } catch (error) {
      console.log(`❌ Error checking availability for ${card.ghanaCardNumber}:`, error.message);
    }
  }

  console.log('\n4️⃣ Testing Ghana Card verification...');

  // Test 4: Full verification
  for (const card of testGhanaCards) {
    try {
      console.log(`   Verifying ${card.ghanaCardNumber}...`);

      const verificationResponse = await fetch(`${API_BASE_URL}/api/ghana-card/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      const verificationData = await verificationResponse.json();

      if (verificationData.success) {
        const verification = verificationData.data.verification;
        const status = verification.isValid ? '✅ Verified' : '❌ Failed';
        const method = verification.verificationMethods.join(', ');

        console.log(`   ${card.ghanaCardNumber}: ${status} (${method})`);
        console.log(`   Message: ${verification.message}`);

        if (verification.verificationData) {
          console.log(`   Verified at: ${verification.verificationData.verifiedAt}`);
        }
      } else {
        console.log(
          `❌ Verification failed for ${card.ghanaCardNumber}:`,
          verificationData.message,
        );
      }
    } catch (error) {
      console.log(`❌ Error verifying ${card.ghanaCardNumber}:`, error.message);
    }
  }

  console.log('\n5️⃣ Testing Ghana Card image validation...');

  // Test 5: Image validation
  try {
    console.log('   Validating Ghana Card image...');

    const imageResponse = await fetch(`${API_BASE_URL}/api/ghana-card/validate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: testImageUrl,
      }),
    });

    const imageData = await imageResponse.json();

    if (imageData.success) {
      const data = imageData.data;
      const status = data.isValid ? '✅ Valid' : '❌ Invalid';
      const confidence = Math.round(data.confidence * 100);

      console.log(`   Image validation: ${status} (${confidence}% confidence)`);
      console.log(`   Method: ${data.verificationMethod}`);
      console.log(`   Message: ${imageData.message}`);

      if (data.extractedData) {
        console.log('   Extracted data:');
        console.log(`     Card Number: ${data.extractedData.cardNumber}`);
        console.log(`     Name: ${data.extractedData.firstName} ${data.extractedData.lastName}`);
        console.log(`     Date of Birth: ${data.extractedData.dateOfBirth}`);
      }
    } else {
      console.log('❌ Image validation failed:', imageData.message);
    }
  } catch (error) {
    console.log('❌ Error validating image:', error.message);
  }

  console.log('\n6️⃣ Testing error handling...');

  // Test 6: Error handling
  try {
    console.log('   Testing invalid Ghana Card number...');

    const errorResponse = await fetch(`${API_BASE_URL}/api/ghana-card/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ghanaCardNumber: 'INVALID-123',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
      }),
    });

    const errorData = await errorResponse.json();

    if (!errorData.success) {
      console.log('✅ Error handling working correctly');
      console.log(`   Error: ${errorData.message}`);
    } else {
      console.log('❌ Expected error but got success');
    }
  } catch (error) {
    console.log('❌ Error testing error handling:', error.message);
  }

  console.log('\n🎉 Ghana Card verification tests completed!');
  console.log('\n📋 Summary:');
  console.log('   - The system supports multiple verification methods');
  console.log('   - Falls back to simulation mode when external APIs are not configured');
  console.log('   - Provides comprehensive error handling and validation');
  console.log('   - Includes image-based verification with OCR');
  console.log('   - Maintains security with proper input validation');

  console.log('\n🔧 To enable real API integration:');
  console.log('   1. Get API keys from NIA, Google Cloud, or AWS');
  console.log('   2. Add them to your .env file');
  console.log('   3. Restart the application');
  console.log('   4. Run this test script again to see real verification');
}

/**
 * Test with real API keys (if available)
 */
async function testWithRealAPIs() {
  console.log('\n🚀 Testing with Real APIs (if configured)...\n');

  const testCard = {
    ghanaCardNumber: 'GHA-123456789-X',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    imageUrl: 'https://example.com/ghana-card-real.jpg',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/ghana-card/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCard),
    });

    const data = await response.json();

    if (data.success) {
      const verification = data.data.verification;
      console.log('✅ Real API verification successful!');
      console.log(`   Method: ${verification.verificationMethods.join(', ')}`);
      console.log(`   Status: ${verification.verificationStatus}`);
      console.log(`   Message: ${verification.message}`);

      if (verification.verificationData) {
        console.log('   Verification details:');
        console.log(`     Method: ${verification.verificationData.verificationMethod}`);
        console.log(`     Verified at: ${verification.verificationData.verifiedAt}`);
      }
    } else {
      console.log('❌ Real API verification failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Error testing with real APIs:', error.message);
  }
}

// Run tests
async function runTests() {
  try {
    await testGhanaCardVerification();

    // Check if we should test with real APIs
    if (process.argv.includes('--real-apis')) {
      await testWithRealAPIs();
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Ghana Card Verification Test Script

Usage:
  node test-ghana-card-verification.js [options]

Options:
  --real-apis    Test with real API integration (if configured)
  --help         Show this help message

Environment Variables:
  API_BASE_URL   Base URL for the API (default: http://localhost:4000)

Examples:
  node test-ghana-card-verification.js
  node test-ghana-card-verification.js --real-apis
  API_BASE_URL=https://api.example.com node test-ghana-card-verification.js
  `);
  process.exit(0);
}

// Run the tests
runTests();
