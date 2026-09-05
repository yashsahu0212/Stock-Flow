import app from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`🚀 StockFlow Backend running on port ${config.port}`);
  console.log(`📡 Base API URL: http://localhost:${config.port}/api`);
  console.log(`🏥 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`🌐 Allowed Frontend Origin: ${config.frontendUrl}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default server;
