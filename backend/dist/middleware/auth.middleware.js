"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const response_1 = require("../utils/response");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        (0, response_1.sendError)(res, 'UNAUTHORIZED', 'Access token is required', 401);
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        (0, response_1.sendError)(res, 'INVALID_TOKEN', 'Access token is invalid or expired', 401);
        return;
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, _res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
            req.user = decoded;
        }
        catch {
            // ignore invalid optional token
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'UNAUTHORIZED', 'Authentication required', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, response_1.sendError)(res, 'FORBIDDEN', `Role ${req.user.role} does not have permission to access this resource`, 403);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
