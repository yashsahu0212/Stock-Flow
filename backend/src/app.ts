import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError, sendSuccess } from './utils/response';

export const app = express();

// Enable CORS for frontend integration
app.use(
  cors({
    origin: [
      config.frontendUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger in non-test environments
if (config.nodeEnv !== 'test') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Root route
app.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, {
    name: 'Stock Flow - Multi-Warehouse Inventory API',
    version: '1.0.0',
    docs: '/docs/backend/API_CONTRACT.md',
    health: '/api/health',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      warehouses: '/api/warehouses',
      bins: '/api/bins',
      inventory: '/api/inventory',
      orders: '/api/orders',
      qrVerify: '/api/qr/verify',
      dashboard: '/api/dashboard',
    },
  });
});

// Mount all API routes
app.use('/api', apiRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  sendError(res, 'ROUTE_NOT_FOUND', 'Requested API route does not exist', 404);
});

// Centralized error handler
app.use(errorHandler);

export default app;
