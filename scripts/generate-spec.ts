// scripts/generate-spec.ts
import '../src/zod-openapi-setup';
import fs from 'fs';
import path from 'path';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from '../src/lib/openapi';
import * as Schemas from '../src/schema';
import '../src/routes/auth.routes'; // Ensure auth OpenAPI registrations are included

// Register all Zod schemas automatically
for (const [name, schema] of Object.entries(Schemas)) {
  if (schema && typeof schema === 'object' && '_def' in schema) {
    registry.register(name, schema as any);
  }
}

// Register bearerAuth security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Paste an **access token** here.',
});

const generator = new OpenApiGeneratorV31(registry.definitions);

const doc = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Marketplace API',
    version: '1.0.0',
    description:
      'Multi-vendor marketplace API — Express, TypeScript, Prisma. Auto-generated from Zod schemas.',
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local development' },
    { url: 'https://api.yourdomain.com', description: 'Production' },
  ],
  security: [{ bearerAuth: [] }],
  tags: [{ name: 'auth', description: 'Authentication endpoints' }],
});

const outPath = path.resolve(__dirname, '../openapi.yaml');
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log(`✅ Generated OpenAPI spec at ${outPath}`);
