"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const server = app_1.default.listen(env_1.config.port, () => {
    console.log(`🚀 StockFlow Backend running on port ${env_1.config.port}`);
    console.log(`📡 Base API URL: http://localhost:${env_1.config.port}/api`);
    console.log(`🏥 Health Check: http://localhost:${env_1.config.port}/api/health`);
    console.log(`🌐 Allowed Frontend Origin: ${env_1.config.frontendUrl}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
exports.default = server;
