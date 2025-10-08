import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { AuthRequest } from '../types';

/**
 * Middleware to authenticate requests using API keys
 * Supports X-API-Key header for third-party integrations
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }

    // Extract the prefix (e.g., "pk_live_" or "pk_test_")
    const prefix = apiKey.substring(0, 8);

    // Find API keys with matching prefix
    const keysResult = await query(
      `SELECT 
        ak.api_key_id,
        ak.organization_id,
        ak.key_name,
        ak.key_hash,
        ak.scopes,
        ak.ip_whitelist,
        ak.rate_limit_per_hour,
        ak.rate_limit_per_day,
        ak.is_active,
        ak.expires_at,
        o.organization_name,
        o.organization_code
      FROM api_keys ak
      JOIN organizations o ON ak.organization_id = o.organization_id
      WHERE ak.key_prefix = $1 
        AND ak.is_active = TRUE
        AND o.is_active = TRUE
        AND o.is_deleted = FALSE
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [prefix]
    );

    if (keysResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Verify the API key against stored hashes
    let validKey = null;
    for (const key of keysResult.rows) {
      const isValid = await bcrypt.compare(apiKey, key.key_hash);
      if (isValid) {
        validKey = key;
        break;
      }
    }

    if (!validKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Check IP whitelist if configured
    if (validKey.ip_whitelist && validKey.ip_whitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!validKey.ip_whitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not whitelisted',
          code: 'IP_NOT_ALLOWED'
        });
      }
    }

    // Check rate limits
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const usageResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at > $1) as hour_count,
        COUNT(*) FILTER (WHERE created_at > $2) as day_count
      FROM api_key_usage_logs
      WHERE api_key_id = $3`,
      [hourAgo, dayAgo, validKey.api_key_id]
    );

    const usage = usageResult.rows[0];
    if (parseInt(usage.hour_count) >= validKey.rate_limit_per_hour) {
      return res.status(429).json({
        success: false,
        error: 'Hourly rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    if (parseInt(usage.day_count) >= validKey.rate_limit_per_day) {
      return res.status(429).json({
        success: false,
        error: 'Daily rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Log API key usage (don't await to avoid blocking)
    const clientIp = req.ip || req.connection.remoteAddress;
    query(
      `INSERT INTO api_key_usage_logs (
        api_key_id, request_method, request_path, 
        request_ip, user_agent, response_status
      ) VALUES ($1, $2, $3, $4, $5, 200)`,
      [validKey.api_key_id, req.method, req.path, clientIp, req.headers['user-agent']]
    ).catch(err => console.error('Failed to log API key usage:', err));

    // Update last_used_at and usage_count
    query(
      `UPDATE api_keys 
       SET last_used_at = NOW(), usage_count = usage_count + 1 
       WHERE api_key_id = $1`,
      [validKey.api_key_id]
    ).catch(err => console.error('Failed to update API key usage:', err));

    // Attach API key info to request
    (req as AuthRequest).apiKey = {
      api_key_id: validKey.api_key_id,
      key_name: validKey.key_name,
      scopes: validKey.scopes || [],
    };

    // Attach organization info to request (similar to user auth)
    (req as AuthRequest).user = {
      organization_id: validKey.organization_id,
      organization_name: validKey.organization_name,
      organization_code: validKey.organization_code,
      // API keys don't have user_id, but we need to track it's an API key auth
      auth_type: 'api_key'
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware to check if API key has required scope
 */
export const requireApiScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.apiKey) {
      return res.status(403).json({
        success: false,
        error: 'API key authentication required',
        code: 'API_KEY_REQUIRED'
      });
    }

    const scopes = authReq.apiKey.scopes as string[];
    
    // Check if the API key has the required scope or a wildcard scope
    const hasScope = scopes.includes(requiredScope) || 
                     scopes.includes('*') ||
                     scopes.some(scope => {
                       const [resource, action] = requiredScope.split(':');
                       return scope === `${resource}:*`;
                     });

    if (!hasScope) {
      return res.status(403).json({
        success: false,
        error: `API key missing required scope: ${requiredScope}`,
        code: 'INSUFFICIENT_SCOPE'
      });
    }

    next();
  };
};

/**
 * Middleware that accepts either JWT or API Key authentication
 */
export const authenticateApiKeyOrJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  if (apiKey) {
    // Use API key authentication
    return authenticateApiKey(req, res, next);
  } else if (authHeader) {
    // Use JWT authentication (import from existing auth middleware)
    const { authenticate } = require('./auth');
    return authenticate(req, res, next);
  } else {
    return res.status(401).json({
      success: false,
      error: 'Authentication required (JWT token or API key)',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
};
