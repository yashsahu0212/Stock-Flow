"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const env_1 = require("../config/env");
class AuthService {
    static async register(input) {
        const existing = await db_1.default.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });
        if (existing) {
            const error = new Error('A user with this email address already exists');
            error.code = 'USER_ALREADY_EXISTS';
            error.statusCode = 409;
            throw error;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(input.password, salt);
        const user = await db_1.default.user.create({
            data: {
                email: input.email.toLowerCase(),
                password: passwordHash,
                name: input.name,
                role: input.role,
            },
        });
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, env_1.config.jwtSecret, { expiresIn: '7d' });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
    static async login(input) {
        const user = await db_1.default.user.findUnique({
            where: { email: input.email.toLowerCase() },
        });
        if (!user) {
            const error = new Error('Invalid email or password');
            error.code = 'INVALID_CREDENTIALS';
            error.statusCode = 401;
            throw error;
        }
        const isMatch = await bcryptjs_1.default.compare(input.password, user.password);
        if (!isMatch) {
            const error = new Error('Invalid email or password');
            error.code = 'INVALID_CREDENTIALS';
            error.statusCode = 401;
            throw error;
        }
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, env_1.config.jwtSecret, { expiresIn: '7d' });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
    static async getProfile(userId) {
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            const error = new Error('User not found');
            error.code = 'USER_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        return user;
    }
}
exports.AuthService = AuthService;
