/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load OpenAPI spec from multiple sources
let spec: any = {};

try {
  const yamlPath = path.join(__dirname, '../openapi.yaml');
  if (fs.existsSync(yamlPath)) {
    spec = YAML.load(yamlPath);
    console.log('✅ Loaded OpenAPI spec from openapi.yaml');
  } else {
    console.log('⚠️ openapi.yaml not found, checking alternative locations...');

    // Try alternative locations
    const altPaths = [
      path.join(__dirname, './openapi.yaml'),
      path.join(__dirname, '../docs/openapi.yaml'),
      path.join(process.cwd(), 'openapi.yaml'),
    ];

    for (const altPath of altPaths) {
      if (fs.existsSync(altPath)) {
        spec = YAML.load(altPath);
        console.log(`✅ Loaded OpenAPI spec from ${altPath}`);
        break;
      }
    }
  }
} catch (error) {
  console.error('❌ Error loading OpenAPI spec:', error);
  // Fallback to a basic spec
  spec = {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation (OpenAPI spec failed to load)',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Development server' }],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
            },
          },
        },
      },
    },
  };
}

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Documentation',
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, swaggerOptions));

// Serve raw JSON spec for debugging
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

// Health check endpoint for docs
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Swagger docs are working',
    specLoaded: Object.keys(spec).length > 0,
  });
});

export default router;
