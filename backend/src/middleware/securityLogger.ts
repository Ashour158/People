import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Security logging middleware
 * Logs security-relevant request information for audit purposes
 */
export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract security-relevant information
  const securityInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection attempts
    /exec\(/i, // Code execution attempts
  ];

  const url = req.url.toLowerCase();
  const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(url));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ...securityInfo,
      url: req.url,
    });
  }

  // Log authentication attempts
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    logger.info('Authentication attempt', securityInfo);
  }

  // Add response time tracking
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        ...securityInfo,
        duration,
        statusCode: res.statusCode,
      });
    }

    // Log failed authentication attempts
    if (
      (req.path.includes('/auth/login') || req.path.includes('/auth/register')) &&
      res.statusCode >= 400
    ) {
      logger.warn('Failed authentication attempt', {
        ...securityInfo,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

/**
 * Sanitize error messages to prevent information disclosure
 */
export const sanitizeError = (error: any): string => {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    // Log the actual error for debugging
    logger.error('Internal error', { error: error.message, stack: error.stack });
    
    // Return generic message
    return 'An internal error occurred';
  }
  
  return error.message || 'An error occurred';
};
