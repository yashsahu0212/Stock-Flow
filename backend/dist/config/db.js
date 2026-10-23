"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
const checkDatabaseConnection = async () => {
    const start = Date.now();
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return {
            connected: true,
            latencyMs: Date.now() - start,
        };
    }
    catch (error) {
        return {
            connected: false,
            latencyMs: Date.now() - start,
            error: error.message || 'Database connection error',
        };
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.default = exports.prisma;
