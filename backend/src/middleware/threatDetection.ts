import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../types';
import {
  logSecurityEvent,
  AuditEventType,
  AuditSeverity,
} from '../services/auditLog.service';

/**
 * Threat Detection Middleware
 * Detects and blocks suspicious activity patterns
 */

interface ThreatScore {
  score: number;
  reasons: string[];
}

interface UserActivity {
  requestCount: number;
  failedLoginCount: number;
  lastActivity: Date;
  ipAddresses: Set<string>;
  suspiciousPatterns: string[];
}

// In-memory cache for user activity tracking
const activityCache = new Map<string, UserActivity>();
const ipBlockList = new Set<string>();

// Threat detection configuration
const THREAT_CONFIG = {
  maxRequestsPerMinute: 60,
  maxFailedLoginsPerHour: 5,
  maxIPsPerUser: 5,
  suspiciousPatterns: [
    /(\bor\b|\band\b).*=.*'/, // SQL injection patterns
    /<script[^>]*>.*<\/script>/i, // XSS patterns
    /\.\.\//, // Path traversal
    /\bexec\b|\beval\b/i, // Code execution
  ],
  threatScoreThreshold: 75,
};

/**
 * Get client IP from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (forwarded as string).split(',')[0].trim();
  }
  return (
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Calculate threat score based on activity patterns
 */
function calculateThreatScore(
  req: Request,
  userActivity?: UserActivity
): ThreatScore {
  let score = 0;
  const reasons: string[] = [];

  const clientIP = getClientIP(req);

  // Check if IP is already blocked
  if (ipBlockList.has(clientIP)) {
    score += 100;
    reasons.push('IP address is blocked');
  }

  // Check request rate
  if (userActivity && userActivity.requestCount > THREAT_CONFIG.maxRequestsPerMinute) {
    score += 30;
    reasons.push('Excessive request rate');
  }

  // Check failed login attempts
  if (userActivity && userActivity.failedLoginCount > THREAT_CONFIG.maxFailedLoginsPerHour) {
    score += 40;
    reasons.push('Multiple failed login attempts');
  }

  // Check IP address changes
  if (userActivity && userActivity.ipAddresses.size > THREAT_CONFIG.maxIPsPerUser) {
    score += 25;
    reasons.push('Multiple IP addresses detected');
  }

  // Check for suspicious patterns in request
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const pattern of THREAT_CONFIG.suspiciousPatterns) {
    if (pattern.test(requestData)) {
      score += 50;
      reasons.push('Suspicious pattern detected in request');
      break;
    }
  }

  // Check for unusual User-Agent
  const userAgent = req.headers['user-agent'];
  if (!userAgent || userAgent.length < 10) {
    score += 15;
    reasons.push('Suspicious or missing User-Agent');
  }

  // Check for known attack signatures in headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-original-url'];
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      score += 10;
      reasons.push(`Suspicious header detected: ${header}`);
    }
  }

  return { score, reasons };
}

/**
 * Update user activity tracking
 */
function updateActivityTracking(userId: string, ip: string): UserActivity {
  let activity = activityCache.get(userId);

  if (!activity) {
    activity = {
      requestCount: 0,
      failedLoginCount: 0,
      lastActivity: new Date(),
      ipAddresses: new Set<string>(),
      suspiciousPatterns: [],
    };
  }

  // Reset counters if more than 1 hour since last activity
  const hoursSinceLastActivity =
    (Date.now() - activity.lastActivity.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastActivity > 1) {
    activity.requestCount = 0;
    activity.failedLoginCount = 0;
  }

  activity.requestCount++;
  activity.lastActivity = new Date();
  activity.ipAddresses.add(ip);

  activityCache.set(userId, activity);

  return activity;
}

/**
 * Threat detection middleware
 */
export const threatDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthRequest).user;
    const clientIP = getClientIP(req);

    // Track activity
    let userActivity: UserActivity | undefined;
    if (user) {
      userActivity = updateActivityTracking(user.user_id, clientIP);
    }

    // Calculate threat score
    const { score, reasons } = calculateThreatScore(req, userActivity);

    // Log suspicious activity
    if (score > 25) {
      logger.warn('Suspicious activity detected', {
        userId: user?.user_id,
        ip: clientIP,
        score,
        reasons,
        path: req.path,
        method: req.method,
      });
    }

    // Block if threat score is too high
    if (score >= THREAT_CONFIG.threatScoreThreshold) {
      // Add IP to block list
      ipBlockList.add(clientIP);

      // Log security event
      await logSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditSeverity.CRITICAL,
        `Blocked suspicious activity: ${reasons.join(', ')}`,
        user?.user_id,
        user?.organization_id,
        req,
        { threatScore: score, reasons }
      );

      // Store in database for persistent blocking
      await blockIP(clientIP, reasons.join(', '), user?.user_id);

      return res.status(403).json({
        success: false,
        error: 'Suspicious activity detected. Access denied.',
        code: 'THREAT_DETECTED',
      });
    }

    // Add threat score to request for logging
    (req as any).threatScore = score;

    next();
  } catch (error) {
    logger.error('Threat detection middleware error', { error });
    // Fail open to not block legitimate users
    next();
  }
};

/**
 * Block an IP address
 */
async function blockIP(
  ipAddress: string,
  reason: string,
  blockedBy?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO blocked_ips (
        ip_address,
        reason,
        blocked_by,
        blocked_at,
        expires_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours')
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        reason = $2,
        blocked_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'`,
      [ipAddress, reason, blockedBy]
    );

    logger.info('IP address blocked', { ipAddress, reason });
  } catch (error) {
    logger.error('Failed to block IP address', { error, ipAddress });
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string): Promise<void> {
  try {
    await query(
      `DELETE FROM blocked_ips WHERE ip_address = $1`,
      [ipAddress]
    );

    ipBlockList.delete(ipAddress);

    logger.info('IP address unblocked', { ipAddress });
  } catch (error) {
    logger.error('Failed to unblock IP address', { error, ipAddress });
  }
}

/**
 * Load blocked IPs from database on startup
 */
export async function loadBlockedIPs(): Promise<void> {
  try {
    const result = await query(
      `SELECT ip_address FROM blocked_ips 
      WHERE expires_at > NOW() OR expires_at IS NULL`
    );

    ipBlockList.clear();
    for (const row of result.rows) {
      ipBlockList.add(row.ip_address);
    }

    logger.info('Loaded blocked IPs', { count: ipBlockList.size });
  } catch (error) {
    logger.error('Failed to load blocked IPs', { error });
  }
}

/**
 * Clean up expired blocks
 */
export async function cleanupExpiredBlocks(): Promise<void> {
  try {
    const result = await query(
      `DELETE FROM blocked_ips 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
      RETURNING ip_address`
    );

    for (const row of result.rows) {
      ipBlockList.delete(row.ip_address);
    }

    logger.info('Cleaned up expired IP blocks', { count: result.rowCount });
  } catch (error) {
    logger.error('Failed to cleanup expired blocks', { error });
  }
}

/**
 * Report failed login attempt
 */
export function reportFailedLogin(userId: string): void {
  const activity = activityCache.get(userId);
  if (activity) {
    activity.failedLoginCount++;
    activityCache.set(userId, activity);
  }
}

/**
 * Clear activity cache (for testing or manual reset)
 */
export function clearActivityCache(): void {
  activityCache.clear();
}
