/**
 * Security Utilities
 * Provides security-related helper functions
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  tokenVersion?: number;
}

/**
 * Generate JWT access token
 * @param payload - Token payload
 * @returns JWT token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as string,
    issuer: 'hr-management-system',
    audience: 'hr-api',
  });
};

/**
 * Generate JWT refresh token
 * @param payload - Token payload
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.refreshExpiresIn as string,
    issuer: 'hr-management-system',
    audience: 'hr-api',
  });
};

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, env.jwt.secret, {
      issuer: 'hr-management-system',
      audience: 'hr-api',
    }) as TokenPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Generate secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex string token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token using SHA-256
 * @param token - Token to hash
 * @returns Hashed token
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Compare a token with its hash
 * @param token - Plain token
 * @param hashedToken - Hashed token
 * @returns true if they match
 */
export const compareToken = (token: string, hashedToken: string): boolean => {
  const hash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
};

/**
 * Generate a secure reset password token
 * @returns Object with token and its hash
 */
export const generateResetToken = (): { token: string; hash: string; expiresAt: Date } => {
  const token = generateSecureToken(32);
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return { token, hash, expiresAt };
};

/**
 * Validate IP address format
 * @param ip - IP address to validate
 * @returns true if valid IPv4 or IPv6
 */
export const isValidIP = (ip: string): boolean => {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6
  const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Extract IP address from request
 * Considers X-Forwarded-For header for proxied requests
 * @param req - Express request object
 * @returns IP address
 */
export const extractIP = (req: any): string => {
  // Check X-Forwarded-For header (proxied requests)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP in the chain
    const ip = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    if (isValidIP(ip)) {
      return ip;
    }
  }
  
  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && isValidIP(realIP as string)) {
    return realIP as string;
  }
  
  // Fall back to socket remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Generate a CSRF token
 * @returns CSRF token
 */
export const generateCSRFToken = (): string => {
  return generateSecureToken(32);
};

/**
 * Sanitize user input to prevent XSS
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Check if request is from a trusted source
 * @param req - Express request object
 * @returns true if request is trusted
 */
export const isTrustedRequest = (req: any): boolean => {
  const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
  const requestIP = extractIP(req);
  
  return trustedIPs.includes(requestIP);
};

/**
 * Generate a secure session ID
 * @returns Session ID
 */
export const generateSessionId = (): string => {
  return generateSecureToken(48);
};

/**
 * Calculate token expiration time
 * @param expiresIn - Duration string (e.g., '24h', '7d')
 * @returns Expiration date
 */
export const calculateExpiration = (expiresIn: string): Date => {
  const match = expiresIn.match(/^(\d+)([hdwmy])$/);
  
  if (!match || !match[1]) {
    throw new Error('Invalid expiration format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const now = Date.now();
  let milliseconds = 0;
  
  switch (unit) {
    case 'h':
      milliseconds = value * 60 * 60 * 1000;
      break;
    case 'd':
      milliseconds = value * 24 * 60 * 60 * 1000;
      break;
    case 'w':
      milliseconds = value * 7 * 24 * 60 * 60 * 1000;
      break;
    case 'm':
      milliseconds = value * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'y':
      milliseconds = value * 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      throw new Error('Invalid time unit');
  }
  
  return new Date(now + milliseconds);
};
