import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const router = express.Router();
let spec: Record<string, unknown>;
try {
  spec = YAML.load(path.join(__dirname, '../openapi.yaml'));
} catch {
  spec = {};
}

router.use('/', swaggerUi.serve, swaggerUi.setup(spec));
export default router;
