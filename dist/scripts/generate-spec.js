// scripts/generate-spec.ts
import '../src/zod-openapi-setup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yamljs';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from '../src/lib/openapi';
import * as Schemas from '../src/schema';
import '../src/routes/auth.routes'; // Ensure auth OpenAPI registrations are included
import '../src/routes/catalogue.routes'; // Ensure catalogue OpenAPI registrations are included
import '../src/routes/vendor.routes'; // Ensure vendor OpenAPI registrations are included
import '../src/routes/analytics.routes'; // Ensure analytics OpenAPI registrations are included
import '../src/routes/upload.routes'; // Ensure upload OpenAPI registrations are included
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Register all Zod schemas automatically
for (const [name, schema] of Object.entries(Schemas)) {
    if (schema && typeof schema === 'object' && '_def' in schema) {
        registry.register(name, schema);
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
        description: 'Multi-vendor marketplace API — Express, TypeScript, Prisma. Auto-generated from Zod schemas.',
    },
    servers: [
        { url: 'http://localhost:4000', description: 'Local development' },
        { url: 'https://api.yourdomain.com', description: 'Production' },
    ],
    security: [{ bearerAuth: [] }],
    tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'catalogue', description: 'Product and store catalogue endpoints' },
        { name: 'vendor', description: 'Vendor dashboard and management endpoints' },
        { name: 'analytics', description: 'Analytics and best-selling products endpoints' },
        { name: 'upload', description: 'Image upload endpoints' },
    ],
});
const outPath = path.resolve(__dirname, '../openapi.yaml');
const yaml = YAML.stringify(doc, 10);
fs.writeFileSync(outPath, yaml);
console.log(`✅ Generated OpenAPI spec at ${outPath}`);
