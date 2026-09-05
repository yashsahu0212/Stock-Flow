"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200, message) => {
    const payload = {
        success: true,
        data,
    };
    if (message) {
        payload.message = message;
    }
    return res.status(statusCode).json(payload);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, code, message, statusCode = 400, details) => {
    const payload = {
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
    };
    return res.status(statusCode).json(payload);
};
exports.sendError = sendError;
