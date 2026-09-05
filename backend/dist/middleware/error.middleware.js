"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const response_1 = require("../utils/response");
const errorHandler = (err, _req, res, _next) => {
    // Handle Zod Schema Validation Errors
    if (err instanceof zod_1.ZodError) {
        const formattedErrors = err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
        (0, response_1.sendError)(res, 'VALIDATION_ERROR', formattedErrors[0]?.message || 'Invalid request body', 400, formattedErrors);
        return;
    }
    // Handle Prisma Database Errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = err.meta?.target || [];
            (0, response_1.sendError)(res, 'DUPLICATE_ENTRY', `A record with this ${target.join(', ') || 'field'} already exists`, 409, { target });
            return;
        }
        if (err.code === 'P2025') {
            (0, response_1.sendError)(res, 'NOT_FOUND', 'Requested record not found in database', 404);
            return;
        }
        if (err.code === 'P2003') {
            (0, response_1.sendError)(res, 'FOREIGN_KEY_VIOLATION', 'Referenced related record does not exist', 400);
            return;
        }
    }
    // Handle custom application error format if thrown as an object with code and message
    if (err.code && err.message && typeof err.statusCode === 'number') {
        (0, response_1.sendError)(res, err.code, err.message, err.statusCode, err.details);
        return;
    }
    console.error('Unhandled Server Error:', err);
    (0, response_1.sendError)(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred on the server', 500);
};
exports.errorHandler = errorHandler;
