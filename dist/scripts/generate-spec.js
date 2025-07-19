"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/generate-spec.ts
require("../src/zod-openapi-setup");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const openapi_1 = require("../src/lib/openapi");
const Schemas = __importStar(require("../src/schema"));
require("../src/routes/auth.routes"); // Ensure auth OpenAPI registrations are included
// Register all Zod schemas automatically
for (const [name, schema] of Object.entries(Schemas)) {
    if (schema && typeof schema === 'object' && '_def' in schema) {
        openapi_1.registry.register(name, schema);
    }
}
// Register bearerAuth security scheme
openapi_1.registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Paste an **access token** here.',
});
const generator = new zod_to_openapi_1.OpenApiGeneratorV31(openapi_1.registry.definitions);
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
    tags: [{ name: 'auth', description: 'Authentication endpoints' }],
});
const outPath = path_1.default.resolve(__dirname, '../openapi.yaml');
fs_1.default.writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log(`✅ Generated OpenAPI spec at ${outPath}`);
