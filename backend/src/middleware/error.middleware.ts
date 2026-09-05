import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    sendError(
      res,
      'VALIDATION_ERROR',
      formattedErrors[0]?.message || 'Invalid request body',
      400,
      formattedErrors
    );
    return;
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      sendError(
        res,
        'DUPLICATE_ENTRY',
        `A record with this ${target.join(', ') || 'field'} already exists`,
        409,
        { target }
      );
      return;
    }

    if (err.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'Requested record not found in database', 404);
      return;
    }

    if (err.code === 'P2003') {
      sendError(
        res,
        'FOREIGN_KEY_VIOLATION',
        'Referenced related record does not exist',
        400
      );
      return;
    }
  }

  // Handle custom application error format if thrown as an object with code and message
  if (err.code && err.message && typeof err.statusCode === 'number') {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  console.error('Unhandled Server Error:', err);
  sendError(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred on the server', 500);
};
