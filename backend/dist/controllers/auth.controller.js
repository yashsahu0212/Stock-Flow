"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const auth_validator_1 = require("../validators/auth.validator");
const response_1 = require("../utils/response");
class AuthController {
    static async register(req, res, next) {
        try {
            const validated = auth_validator_1.registerSchema.parse(req.body);
            const result = await auth_service_1.AuthService.register(validated);
            (0, response_1.sendSuccess)(res, result, 201, 'User registered successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const validated = auth_validator_1.loginSchema.parse(req.body);
            const result = await auth_service_1.AuthService.login(validated);
            (0, response_1.sendSuccess)(res, result, 200, 'Login successful');
        }
        catch (err) {
            next(err);
        }
    }
    static async me(req, res, next) {
        try {
            const profile = await auth_service_1.AuthService.getProfile(req.user.userId);
            (0, response_1.sendSuccess)(res, profile, 200);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
