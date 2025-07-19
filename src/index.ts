/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import dotenv from 'dotenv';
import apiDocs from './openapi';
import authRoutes from './routes/auth.routes';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import catalogueRoutes from './routes/catalogue.routes';
import vendorRoutes from './routes/vendor.routes';
import analyticsRoutes from './routes/analytics.routes';
import uploadRoutes from './routes/upload.routes';
import enhancedUploadRoutes from './routes/enhanced-upload.routes';
import productImageRoutes from './routes/product-image.routes';
import cartRoutes from './routes/cart.routes';
import enhancedCartRoutes from './routes/enhanced-cart.routes';
import orderRoutes from './routes/order.routes';
import { ZodError } from 'zod';

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000'] }));
app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(generalLimiter);

const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });

app.use('/docs', apiDocs);
app.use('/auth', authLimiter, authRoutes);
app.use('/', catalogueRoutes);
app.use('/vendor', vendorRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/upload', uploadRoutes);
app.use('/enhanced-upload', enhancedUploadRoutes);
app.use('/vendor/products', productImageRoutes);
app.use('/', cartRoutes);
app.use('/', enhancedCartRoutes);
app.use('/', orderRoutes);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.issues,
    });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Listening on http://localhost:${port}`);
});
export { app };
