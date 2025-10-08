import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ApiKeyService } from '../services/apiKey.service';
import { logger } from '../config/logger';

/**
 * Middleware to authenticate requests using API keys
 */
export function createApiKeyAuthMiddleware(db: Pool) {
  const apiKeyService = new ApiKeyService(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Extract API key from header
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key required',
          message: 'Please provide an API key in the X-API-Key header'
        });
      }

      // Validate API key
      const validatedKey = await apiKeyService.validateApiKey(apiKey);

      if (!validatedKey) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          message: 'The provided API key is invalid or has expired'
        });
      }

      // Check IP whitelist
      const clientIp = req.ip || req.connection.remoteAddress || '';
      if (!apiKeyService.checkIpWhitelist(validatedKey, clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Your IP address is not whitelisted for this API key'
        });
      }

      // Check rate limit
      const rateLimit = await apiKeyService.checkRateLimit(validatedKey.api_key_id);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimit.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit.limit - rateLimit.current));
      res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'You have exceeded the rate limit for this API key',
          rate_limit: {
            limit: rateLimit.limit,
            current: rateLimit.current,
            reset_at: rateLimit.resetAt
          }
        });
      }

      // Add API key info to request
      (req as any).apiKey = validatedKey;
      (req as any).organization_id = validatedKey.organization_id;

      // Log usage after response
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        apiKeyService.logUsage({
          api_key_id: validatedKey.api_key_id,
          endpoint: req.path,
          method: req.method,
          status_code: res.statusCode,
          ip_address: clientIp,
          user_agent: req.headers['user-agent'],
          response_time_ms: responseTime
        }).catch(error => {
          logger.error('Error logging API key usage:', error);
        });
      });

      next();
    } catch (error) {
      logger.error('Error in API key authentication:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to check if API key has required permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const apiKeyService = new ApiKeyService((req as any).db);
    
    if (!apiKeyService.hasPermission(apiKey, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This API key does not have '${permission}' permission`
      });
    }

    next();
  };
}

/**
 * Middleware to check if API key can access scope
 */
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const apiKeyService = new ApiKeyService((req as any).db);
    
    if (!apiKeyService.canAccessScope(apiKey, scope)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `This API key cannot access '${scope}' scope`
      });
    }

    next();
  };
}
