import request from 'supertest';
import app from '../app';
import { query } from '../config/database';
import jwt from 'jsonwebtoken';

// Mock modules
jest.mock('../config/database');
jest.mock('../services/mfa.service');
jest.mock('../services/auditLog.service');
jest.mock('../services/securityMonitoring.service');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Security Routes', () => {
  let authToken: string;
  let userId: string;
  let organizationId: string;

  beforeEach(() => {
    userId = '123e4567-e89b-12d3-a456-426614174000';
    organizationId = '123e4567-e89b-12d3-a456-426614174001';
    
    // Create a mock JWT token
    authToken = jwt.sign(
      { userId, organizationId },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Mock user authentication
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: userId,
        username: 'testuser',
        email: 'test@example.com',
        organization_id: organizationId,
        roles: ['ADMIN'],
        permissions: ['ADMIN', 'SECURITY_ADMIN'],
      }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MFA Endpoints', () => {
    describe('POST /api/v1/security/mfa/setup', () => {
      it('should generate MFA secret for authenticated user', async () => {
        const mfaService = require('../services/mfa.service');
        mfaService.generateMFASecret = jest.fn().mockResolvedValue({
          secret: 'BASE32SECRET',
          qrCodeUrl: 'data:image/png;base64,test',
          backupCodes: ['ABCD-1234', 'EFGH-5678'],
        });

        const response = await request(app)
          .post('/api/v1/security/mfa/setup')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('secret');
        expect(response.body.data).toHaveProperty('qrCodeUrl');
        expect(response.body.data).toHaveProperty('backupCodes');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/security/mfa/setup');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/security/mfa/verify', () => {
      it('should verify and enable MFA with valid token', async () => {
        const mfaService = require('../services/mfa.service');
        mfaService.verifyAndEnableMFA = jest.fn().mockResolvedValue(true);

        const response = await request(app)
          .post('/api/v1/security/mfa/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: '123456' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('enabled');
      });

      it('should reject invalid token', async () => {
        const mfaService = require('../services/mfa.service');
        mfaService.verifyAndEnableMFA = jest.fn().mockResolvedValue(false);

        const response = await request(app)
          .post('/api/v1/security/mfa/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: '000000' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate token format', async () => {
        const response = await request(app)
          .post('/api/v1/security/mfa/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: 'invalid' });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/security/mfa/status', () => {
      it('should return MFA status', async () => {
        const mfaService = require('../services/mfa.service');
        mfaService.getMFAStatus = jest.fn().mockResolvedValue({
          enabled: true,
          verified: true,
        });

        const response = await request(app)
          .get('/api/v1/security/mfa/status')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('enabled');
        expect(response.body.data).toHaveProperty('verified');
      });
    });
  });

  describe('IP Whitelist Endpoints', () => {
    describe('GET /api/v1/security/ip-whitelist', () => {
      it('should get IP whitelist settings', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            enable_ip_whitelist: true,
            allowed_ips: ['192.168.1.0/24'],
            allow_localhost: true,
          }],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

        const response = await request(app)
          .get('/api/v1/security/ip-whitelist')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('enable_ip_whitelist');
      });
    });

    describe('POST /api/v1/security/ip-whitelist', () => {
      it('should add IP to whitelist', async () => {
        const ipWhitelist = require('../middleware/ipWhitelist');
        ipWhitelist.addIPToWhitelist = jest.fn().mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/v1/security/ip-whitelist')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ipAddress: '192.168.1.100' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should validate IP address format', async () => {
        const response = await request(app)
          .post('/api/v1/security/ip-whitelist')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ipAddress: 'invalid-ip' });

        expect(response.status).toBe(400);
      });

      it('should accept CIDR notation', async () => {
        const ipWhitelist = require('../middleware/ipWhitelist');
        ipWhitelist.addIPToWhitelist = jest.fn().mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/v1/security/ip-whitelist')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ipAddress: '192.168.1.0/24' });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Audit Logs Endpoints', () => {
    describe('GET /api/v1/security/audit-logs', () => {
      it('should get audit logs with filters', async () => {
        const auditLogService = require('../services/auditLog.service');
        auditLogService.getAuditLogs = jest.fn().mockResolvedValue({
          logs: [],
          total: 0,
          page: 1,
          limit: 50,
        });

        const response = await request(app)
          .get('/api/v1/security/audit-logs')
          .query({ page: 1, limit: 50 })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('logs');
        expect(response.body.data).toHaveProperty('total');
      });

      it('should validate query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/security/audit-logs')
          .query({ page: -1 })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Security Monitoring Endpoints', () => {
    describe('GET /api/v1/security/dashboard', () => {
      it('should get security dashboard', async () => {
        const securityMonitoring = require('../services/securityMonitoring.service');
        securityMonitoring.getSecurityDashboard = jest.fn().mockResolvedValue({
          metrics: {},
          trends: {},
          riskyUsers: [],
        });

        const response = await request(app)
          .get('/api/v1/security/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/v1/security/metrics', () => {
      it('should get security metrics', async () => {
        const securityMonitoring = require('../services/securityMonitoring.service');
        securityMonitoring.getSecurityMetrics = jest.fn().mockResolvedValue({
          failedLogins: 5,
          suspiciousActivity: 2,
          blockedIPs: 1,
          activeSessions: 10,
          mfaEnabled: 8,
        });

        const response = await request(app)
          .get('/api/v1/security/metrics')
          .query({ timeframe: 'day' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('failedLogins');
      });
    });

    describe('GET /api/v1/security/vulnerabilities', () => {
      it('should check security vulnerabilities', async () => {
        const securityMonitoring = require('../services/securityMonitoring.service');
        securityMonitoring.checkSecurityVulnerabilities = jest.fn().mockResolvedValue([
          {
            type: 'MFA_NOT_ENABLED',
            severity: 'HIGH',
            description: 'Some users do not have MFA enabled',
          },
        ]);

        const response = await request(app)
          .get('/api/v1/security/vulnerabilities')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Blocked IPs Endpoints', () => {
    describe('GET /api/v1/security/blocked-ips', () => {
      it('should get list of blocked IPs', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              ip_address: '192.168.1.100',
              reason: 'Too many failed login attempts',
              blocked_at: new Date(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          ],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

        const response = await request(app)
          .get('/api/v1/security/blocked-ips')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('DELETE /api/v1/security/blocked-ips/:ipAddress', () => {
      it('should unblock an IP address', async () => {
        const threatDetection = require('../middleware/threatDetection');
        threatDetection.unblockIP = jest.fn().mockResolvedValue(undefined);

        const response = await request(app)
          .delete('/api/v1/security/blocked-ips/192.168.1.100')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Authorization', () => {
    it('should require ADMIN or SECURITY_ADMIN role for most endpoints', async () => {
      // Mock user without proper permissions
      mockQuery.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          username: 'testuser',
          email: 'test@example.com',
          organization_id: organizationId,
          roles: ['USER'],
          permissions: ['READ'],
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .get('/api/v1/security/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow MFA endpoints for all authenticated users', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          username: 'testuser',
          email: 'test@example.com',
          organization_id: organizationId,
          roles: ['USER'],
          permissions: ['READ'],
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const mfaService = require('../services/mfa.service');
      mfaService.getMFAStatus = jest.fn().mockResolvedValue({
        enabled: false,
        verified: false,
      });

      const response = await request(app)
        .get('/api/v1/security/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});
