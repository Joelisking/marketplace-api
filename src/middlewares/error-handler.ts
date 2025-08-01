/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { formatZodErrors } from '../utils/validation-errors';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = formatZodErrors(error);
    return res.status(400).json({
      message: formattedErrors.message,
      errors: formattedErrors.errors,
    });
  }

  // Handle custom app errors
  if ((error as AppError).statusCode) {
    const appError = error as AppError;
    return res.status(appError.statusCode || 400).json({
      message: appError.message || 'An error occurred',
    });
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json({
          message: 'A record with this information already exists',
        });
      case 'P2025':
        return res.status(404).json({
          message: 'The requested record was not found',
        });
      case 'P2003':
        return res.status(400).json({
          message: 'Invalid reference: the related record does not exist',
        });
      default:
        return res.status(400).json({
          message: 'Database operation failed',
        });
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token - please authenticate again',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token has expired - please authenticate again',
    });
  }

  // Handle bcrypt errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed - please check your input',
    });
  }

  // Default error response
  const statusCode = (error as AppError).statusCode || 500;
  const message =
    statusCode === 500
      ? 'Internal server error - please try again later'
      : error.message || 'An error occurred';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

// Wrapper function to handle async errors in controllers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any> | any,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Utility function to create custom errors
export function createError(message: string, statusCode: number = 400): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
