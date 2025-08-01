import express from 'express';
import dotenv from 'dotenv';
import authRoutes from '../../src/routes/auth.routes';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import catalogueRoutes from '../../src/routes/catalogue.routes';
import vendorRoutes from '../../src/routes/vendor.routes';
import analyticsRoutes from '../../src/routes/analytics.routes';
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
// Skip OpenAPI docs for tests
// app.use('/docs', apiDocs);
app.use('/auth', authLimiter, authRoutes);
app.use('/', catalogueRoutes);
app.use('/vendor', vendorRoutes);
app.use('/analytics', analyticsRoutes);
// Error handling middleware
app.use((error, req, res, next) => {
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
export { app };
