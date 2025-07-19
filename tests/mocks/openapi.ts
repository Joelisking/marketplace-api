// Mock OpenAPI module for tests
import express from 'express';

const router = express.Router();

// Mock Swagger UI setup
router.use('/', (req, res) => {
  res.json({ message: 'Mock Swagger UI' });
});

router.get('/swagger.json', (req, res) => {
  res.json({ message: 'Mock OpenAPI spec' });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mock Swagger docs are working',
    specLoaded: true,
  });
});

export default router;
