/**
 * Security Utilities Tests
 * Tests for security-related utility functions
 */

import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateSecureToken,
  hashToken,
  compareToken,
  generateResetToken,
  isValidIP,
  extractIP,
  sanitizeInput,
  generateSessionId,
  calculateExpiration,
} from '../../utils/securityUtils';

describe('Security Utils', () => {
  describe('Token Generation', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        email: 'test@example.com',
      };

      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate valid refresh token', () => {
      const payload = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        email: 'test@example.com',
      };

      const token = generateRefreshToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid token', () => {
      const payload = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        email: 'test@example.com',
      };

      const token = generateAccessToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.organizationId).toBe(payload.organizationId);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('Secure Token Generation', () => {
    it('should generate secure random token', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Hashing', () => {
    it('should hash token consistently', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'token1';
      const token2 = 'token2';
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);
      expect(hash1).not.toBe(hash2);
    });

    it('should compare token with hash correctly', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(compareToken(token, hash)).toBe(true);
      expect(compareToken('wrong-token', hash)).toBe(false);
    });
  });

  describe('Reset Token Generation', () => {
    it('should generate reset token with hash and expiration', () => {
      const result = generateResetToken();
      
      expect(result.token).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('IP Validation', () => {
    it('should validate IPv4 addresses', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('172.16.0.1')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('not-an-ip')).toBe(false);
    });

    it('should validate IPv6 addresses', () => {
      expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });
  });

  describe('IP Extraction', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      expect(extractIP(req)).toBe('192.168.1.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      expect(extractIP(req)).toBe('192.168.1.1');
    });

    it('should fall back to req.ip', () => {
      const req = {
        headers: {},
        ip: '192.168.1.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      expect(extractIP(req)).toBe('192.168.1.1');
    });
  });

  describe('Input Sanitization', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick=alert("xss")')).toBe('alert("xss")');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });
  });

  describe('Session ID Generation', () => {
    it('should generate session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(96); // 48 bytes = 96 hex chars
    });

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Expiration Calculation', () => {
    it('should calculate expiration for hours', () => {
      const exp = calculateExpiration('24h');
      const expectedTime = Date.now() + 24 * 60 * 60 * 1000;
      expect(exp.getTime()).toBeGreaterThanOrEqual(expectedTime - 1000);
      expect(exp.getTime()).toBeLessThanOrEqual(expectedTime + 1000);
    });

    it('should calculate expiration for days', () => {
      const exp = calculateExpiration('7d');
      const expectedTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(exp.getTime()).toBeGreaterThanOrEqual(expectedTime - 1000);
      expect(exp.getTime()).toBeLessThanOrEqual(expectedTime + 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => calculateExpiration('invalid')).toThrow('Invalid expiration format');
    });
  });
});
