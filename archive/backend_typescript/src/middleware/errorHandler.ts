import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError = err as AppError;
  let statusCode = appError.statusCode || 500;
  let message = err.message;

  if (!appError.isOperational) {
    logger.error('Unexpected error:', err);
    statusCode = 500;
    message = 'Internal server error';
  } else {
    logger.warn('Operational error:', { statusCode, message, path: req.path });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
