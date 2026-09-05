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

import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(__dirname, '../../');
const frontendDir = path.join(rootDir, 'Frontend');

// HTML delivery middleware with dynamic backend bridge injection
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    let filePath = '';
    const reqFile = (req.path === '/' || req.path === '/index.html') ? 'index.html' : req.path.replace(/^\//, '');
    
    if (fs.existsSync(path.join(frontendDir, reqFile))) {
      filePath = path.join(frontendDir, reqFile);
    } else if (fs.existsSync(path.join(rootDir, reqFile))) {
      filePath = path.join(rootDir, reqFile);
    }

    if (filePath && filePath.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes('app-bridge.js')) {
        content = content.replace('</body>', '<script src="/app-bridge.js"></script></body>');
      }
      return res.type('html').send(content);
    }
  }
  next();
});

// Serve static frontend assets and pages from Frontend directory
app.use(express.static(frontendDir));
app.use(express.static(rootDir));

// Mount all API routes
app.use('/api', apiRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  sendError(res, 'ROUTE_NOT_FOUND', 'Requested API route does not exist', 404);
});

// Centralized error handler
app.use(errorHandler);

export default app;
