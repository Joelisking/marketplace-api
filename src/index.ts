import express from 'express';
import dotenv from 'dotenv';
import apiDocs from './openapi';
import authRoutes from './routes/auth.routes';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import catalogueRoutes from './routes/catalogue.routes';

dotenv.config();
const app = express();

app.use(express.json());
// TODO: mount your routers here

app.use('/docs', apiDocs);

app.use('/auth', authRoutes);
app.use('/', catalogueRoutes);

app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000'] }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  }),
);
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });
app.use('/auth', authLimiter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Listening on http://localhost:${port}`);
});
export { app };
