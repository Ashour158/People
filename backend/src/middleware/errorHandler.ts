import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { sanitizeError } from './securityLogger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = err;

  // Log error details
  if (!err.isOperational) {
    logger.error('Unexpected error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    statusCode = 500;
    message = sanitizeError(err);
  } else {
    logger.warn('Operational error:', { 
      statusCode, 
      message, 
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }

  // Don't expose internal error details in production
  const response: any = {
    success: false,
    error: message,
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
