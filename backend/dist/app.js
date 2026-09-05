"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const response_1 = require("./utils/response");
exports.app = (0, express_1.default)();
// Enable CORS for frontend integration
exports.app.use((0, cors_1.default)({
    origin: [
        env_1.config.frontendUrl,
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
}));
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
// Simple request logger in non-test environments
if (env_1.config.nodeEnv !== 'test') {
    exports.app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rootDir = path_1.default.resolve(__dirname, '../../');
const frontendDir = path_1.default.join(rootDir, 'Frontend');
// HTML delivery middleware with dynamic backend bridge injection
exports.app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        let filePath = '';
        const reqFile = (req.path === '/' || req.path === '/index.html') ? 'index.html' : req.path.replace(/^\//, '');
        if (fs_1.default.existsSync(path_1.default.join(frontendDir, reqFile))) {
            filePath = path_1.default.join(frontendDir, reqFile);
        }
        else if (fs_1.default.existsSync(path_1.default.join(rootDir, reqFile))) {
            filePath = path_1.default.join(rootDir, reqFile);
        }
        if (filePath && filePath.endsWith('.html')) {
            let content = fs_1.default.readFileSync(filePath, 'utf-8');
            if (!content.includes('app-bridge.js')) {
                content = content.replace('</body>', '<script src="/app-bridge.js"></script></body>');
            }
            return res.type('html').send(content);
        }
    }
    next();
});
// Serve static frontend assets and pages from Frontend directory
exports.app.use(express_1.default.static(frontendDir));
exports.app.use(express_1.default.static(rootDir));
// Mount all API routes
exports.app.use('/api', routes_1.default);
// 404 Handler
exports.app.use((_req, res) => {
    (0, response_1.sendError)(res, 'ROUTE_NOT_FOUND', 'Requested API route does not exist', 404);
});
// Centralized error handler
exports.app.use(error_middleware_1.errorHandler);
exports.default = exports.app;
