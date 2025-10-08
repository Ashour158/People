import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../types';

/**
 * IP Whitelisting Middleware
 * Checks if the requesting IP is whitelisted for the organization
 */

interface IPWhitelistConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowLocalhost: boolean;
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  // Check for IP in various headers (for reverse proxy scenarios)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }

  return (
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    // Exact match
    return ip === cidr;
  }

  // Parse CIDR notation
  const [range, bits] = cidr.split('/');
  const mask = -1 << (32 - parseInt(bits, 10));

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP address to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, part) => acc * 256 + parseInt(part, 10), 0);
}

/**
 * Check if IP is localhost
 */
function isLocalhost(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('127.') ||
    ip.startsWith('::ffff:127.')
  );
}

/**
 * IP Whitelist middleware
 */
export const ipWhitelist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientIP = getClientIP(req);
    const user = (req as AuthRequest).user;

    // Skip if no user (public endpoints)
    if (!user) {
      return next();
    }

    // Get organization's IP whitelist settings
    const result = await query(
      `SELECT 
        enable_ip_whitelist,
        allowed_ips,
        allow_localhost
      FROM organizations
      WHERE organization_id = $1 AND is_deleted = FALSE`,
      [user.organization_id]
    );

    if (result.rows.length === 0) {
      return next();
    }

    const config: IPWhitelistConfig = {
      enabled: result.rows[0].enable_ip_whitelist || false,
      allowedIPs: result.rows[0].allowed_ips || [],
      allowLocalhost: result.rows[0].allow_localhost !== false,
    };

    // Skip if IP whitelisting is not enabled
    if (!config.enabled) {
      return next();
    }

    // Allow localhost if configured
    if (config.allowLocalhost && isLocalhost(clientIP)) {
      return next();
    }

    // Check if IP is whitelisted
    const isAllowed = config.allowedIPs.some((allowedIP) =>
      isIPInCIDR(clientIP, allowedIP)
    );

    if (!isAllowed) {
      logger.warn('IP not whitelisted', {
        clientIP,
        userId: user.user_id,
        organizationId: user.organization_id,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied: IP address not whitelisted',
        code: 'IP_NOT_WHITELISTED',
      });
    }

    // Log successful access
    logger.debug('IP whitelist check passed', {
      clientIP,
      userId: user.user_id,
    });

    next();
  } catch (error) {
    logger.error('IP whitelist middleware error', { error });
    // Fail open in case of error (don't block legitimate users)
    next();
  }
};

/**
 * Add IP to whitelist for an organization
 */
export async function addIPToWhitelist(
  organizationId: string,
  ipAddress: string,
  addedBy: string
): Promise<void> {
  await query(
    `UPDATE organizations
    SET allowed_ips = array_append(allowed_ips, $1),
        modified_at = NOW(),
        modified_by = $2
    WHERE organization_id = $3
      AND NOT ($1 = ANY(allowed_ips))`,
    [ipAddress, addedBy, organizationId]
  );

  logger.info('IP added to whitelist', {
    organizationId,
    ipAddress,
    addedBy,
  });
}

/**
 * Remove IP from whitelist
 */
export async function removeIPFromWhitelist(
  organizationId: string,
  ipAddress: string,
  removedBy: string
): Promise<void> {
  await query(
    `UPDATE organizations
    SET allowed_ips = array_remove(allowed_ips, $1),
        modified_at = NOW(),
        modified_by = $2
    WHERE organization_id = $3`,
    [ipAddress, removedBy, organizationId]
  );

  logger.info('IP removed from whitelist', {
    organizationId,
    ipAddress,
    removedBy,
  });
}
