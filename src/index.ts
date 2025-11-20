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
import paymentRoutes from './routes/payment.routes';
import superAdminRoutes from './routes/super-admin.routes';
import customerRoutes from './routes/customer.routes';
import notificationRoutes from './routes/notification.routes';
import vendorOnboardingRoutes from './routes/vendor-onboarding.routes';
import bankVerificationRoutes from './routes/bank-verification.routes';
import otpRoutes from './routes/otp.routes';
import { errorHandler } from './middlewares/error-handler';
import { initializeBucket } from './services/upload.service';

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
app.use('/', paymentRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/', customerRoutes);
app.use('/', notificationRoutes);
app.use('/vendor-onboarding', vendorOnboardingRoutes);
app.use('/bank-verification', bankVerificationRoutes);
app.use('/otp', otpRoutes);

// Global error handling middleware
app.use(errorHandler);

const port = process.env.PORT || 4000;

// Initialize the application
async function startServer() {
  try {
    // Initialize S3 bucket
    await initializeBucket();

    app.listen(port, () => {
      console.log(`🚀 Listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
export { app };
