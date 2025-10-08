/**
 * Security Logger Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { securityLogger, sanitizeError } from '../../middleware/securityLogger';
import { logger } from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Security Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test Agent',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    const finishCallbacks: Array<() => void> = [];
    
    mockResponse = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallbacks.push(callback);
        }
        return mockResponse as Response;
      }) as any,
      statusCode: 200,
    };

    // Add helper to trigger finish callbacks
    (mockResponse as any).triggerFinish = () => {
      finishCallbacks.forEach(cb => cb());
    };

    nextFunction = jest.fn();

    // Clear mock calls
    jest.clearAllMocks();
  });

  it('should call next function', () => {
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should log suspicious request patterns', () => {
    mockRequest.url = '/api/test?file=../../etc/passwd';
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(logger.warn).toHaveBeenCalledWith(
      'Suspicious request detected',
      expect.objectContaining({
        method: 'GET',
        path: '/api/test',
        ip: '127.0.0.1',
      })
    );
  });

  it('should detect XSS attempts', () => {
    mockRequest.url = '/api/test?input=<script>alert("xss")</script>';
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should detect SQL injection attempts', () => {
    mockRequest.url = '/api/test?id=1 union select * from users';
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should log authentication attempts', () => {
    mockRequest = {
      ...mockRequest,
      path: '/api/auth/login',
    };
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(logger.info).toHaveBeenCalledWith(
      'Authentication attempt',
      expect.objectContaining({
        method: 'GET',
        path: '/api/auth/login',
      })
    );
  });

  it('should log slow requests', (done) => {
    mockRequest = {
      ...mockRequest,
      path: '/api/slow-endpoint',
    };
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // Simulate slow request (must be > 5000ms according to middleware)
    setTimeout(() => {
      (mockResponse as any).triggerFinish();
      
      // Give time for the async logger to execute
      setImmediate(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Slow request detected',
          expect.objectContaining({
            path: '/api/slow-endpoint',
            statusCode: 200,
          })
        );
        done();
      });
    }, 5100);
  }, 10000); // Increase test timeout

  it('should log failed authentication attempts', () => {
    mockRequest = {
      ...mockRequest,
      path: '/api/auth/login',
    };
    mockResponse.statusCode = 401;
    
    securityLogger(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // Trigger finish event
    (mockResponse as any).triggerFinish();
    
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed authentication attempt',
      expect.objectContaining({
        path: '/api/auth/login',
        statusCode: 401,
      })
    );
  });
});

describe('sanitizeError', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return generic message in production', () => {
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Detailed database error: Connection failed');
    const sanitized = sanitizeError(error);
    
    expect(sanitized).toBe('An internal error occurred');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return actual error message in development', () => {
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Detailed error message');
    const sanitized = sanitizeError(error);
    
    expect(sanitized).toBe('Detailed error message');
  });

  it('should handle errors without message', () => {
    process.env.NODE_ENV = 'development';
    
    const sanitized = sanitizeError({});
    
    expect(sanitized).toBe('An error occurred');
  });
});
