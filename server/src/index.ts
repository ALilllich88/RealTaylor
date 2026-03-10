// Load .env for local development (tsx doesn't auto-load it)
import { createRequire } from 'module';
try {
  const require = createRequire(import.meta.url);
  const dotenv = require('dotenv');
  dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
} catch { /* dotenv not installed — rely on process env */ }

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import placesRouter from './routes/places.js';
import mileageRouter from './routes/mileage.js';
import hoursRouter from './routes/hours.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use('/api/places', authMiddleware, placesRouter);
app.use('/api/mileage', authMiddleware, mileageRouter);
app.use('/api/hours', authMiddleware, hoursRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/reports', authMiddleware, reportsRouter);

// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`RealTaylor server running on http://localhost:${PORT}`);
});
