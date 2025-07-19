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
const authLimiter = rateLimit({ windowMs: 60000, max: 20 });
app.use('/docs', apiDocs);
app.use('/auth', authLimiter, authRoutes);
app.use('/', catalogueRoutes);
app.use('/vendor', vendorRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/upload', uploadRoutes);
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`🚀 Listening on http://localhost:${port}`);
});
export { app };
