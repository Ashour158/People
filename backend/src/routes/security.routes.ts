import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { AuthRequest } from '../types';
import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';
import {
  generateMFASecret,
  verifyAndEnableMFA,
  disableMFA,
  getMFAStatus,
  regenerateBackupCodes,
} from '../services/mfa.service';
import {
  getSecurityMetrics,
  getSecurityDashboard,
  checkSecurityVulnerabilities,
  generateSecurityReport,
} from '../services/securityMonitoring.service';
import {
  getAuditLogs,
  AuditEventType,
  AuditSeverity,
} from '../services/auditLog.service';
import {
  addIPToWhitelist,
  removeIPFromWhitelist,
} from '../middleware/ipWhitelist';
import { unblockIP } from '../middleware/threatDetection';
import { query } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const mfaTokenSchema = Joi.object({
  token: Joi.string().required().length(6).pattern(/^\d+$/),
});

const ipWhitelistSchema = Joi.object({
  ipAddress: Joi.string()
    .required()
    .pattern(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/),
});

const auditLogFilterSchema = Joi.object({
  eventType: Joi.string().optional(),
  severity: Joi.string().optional(),
  userId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
});

const securityReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});

// =====================================================
// MFA (Multi-Factor Authentication) ROUTES
// =====================================================

/**
 * Generate MFA secret and QR code
 */
router.post(
  '/mfa/setup',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await generateMFASecret(user.user_id, user.email);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Verify MFA token and enable MFA
 */
router.post(
  '/mfa/verify',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { error, value } = mfaTokenSchema.validate(req.body);
      if (error) {
        throw new AppError(400, error.details[0].message);
      }

      const user = req.user!;
      const verified = await verifyAndEnableMFA(user.user_id, value.token);

      if (!verified) {
        return res.status(400).json({
          success: false,
          error: 'Invalid MFA token',
        });
      }

      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Disable MFA
 */
router.post(
  '/mfa/disable',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await disableMFA(user.user_id);

      res.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get MFA status
 */
router.get(
  '/mfa/status',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const status = await getMFAStatus(user.user_id);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Regenerate backup codes
 */
router.post(
  '/mfa/backup-codes',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const backupCodes = await regenerateBackupCodes(user.user_id);

      res.json({
        success: true,
        data: { backupCodes },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// IP WHITELIST ROUTES
// =====================================================

/**
 * Get IP whitelist settings
 */
router.get(
  '/ip-whitelist',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await query(
        `SELECT enable_ip_whitelist, allowed_ips, allow_localhost
        FROM organizations
        WHERE organization_id = $1`,
        [user.organization_id]
      );

      res.json({
        success: true,
        data: result.rows[0] || {},
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Add IP to whitelist
 */
router.post(
  '/ip-whitelist',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { error, value } = ipWhitelistSchema.validate(req.body);
      if (error) {
        throw new AppError(400, error.details[0].message);
      }

      const user = req.user!;
      await addIPToWhitelist(
        user.organization_id,
        value.ipAddress,
        user.user_id
      );

      res.json({
        success: true,
        message: 'IP address added to whitelist',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Remove IP from whitelist
 */
router.delete(
  '/ip-whitelist/:ipAddress',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await removeIPFromWhitelist(
        user.organization_id,
        req.params.ipAddress,
        user.user_id
      );

      res.json({
        success: true,
        message: 'IP address removed from whitelist',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Enable/disable IP whitelisting
 */
router.put(
  '/ip-whitelist/toggle',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { enabled } = req.body;

      await query(
        `UPDATE organizations
        SET enable_ip_whitelist = $1,
            modified_at = NOW(),
            modified_by = $2
        WHERE organization_id = $3`,
        [enabled, user.user_id, user.organization_id]
      );

      res.json({
        success: true,
        message: `IP whitelisting ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// AUDIT LOGS ROUTES
// =====================================================

/**
 * Get audit logs
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { error, value } = auditLogFilterSchema.validate(req.query);
      if (error) {
        throw new AppError(400, error.details[0].message);
      }

      const user = req.user!;
      const logs = await getAuditLogs({
        organizationId: user.organization_id,
        ...value,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// SECURITY MONITORING ROUTES
// =====================================================

/**
 * Get security dashboard
 */
router.get(
  '/dashboard',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const dashboard = await getSecurityDashboard(user.organization_id);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get security metrics
 */
router.get(
  '/metrics',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const timeframe = (req.query.timeframe as 'day' | 'week' | 'month') || 'day';
      const metrics = await getSecurityMetrics(user.organization_id, timeframe);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Check security vulnerabilities
 */
router.get(
  '/vulnerabilities',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const vulnerabilities = await checkSecurityVulnerabilities(
        user.organization_id
      );

      res.json({
        success: true,
        data: vulnerabilities,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate security report
 */
router.post(
  '/report',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { error, value } = securityReportSchema.validate(req.body);
      if (error) {
        throw new AppError(400, error.details[0].message);
      }

      const user = req.user!;
      const report = await generateSecurityReport(
        user.organization_id,
        new Date(value.startDate),
        new Date(value.endDate)
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get blocked IPs
 */
router.get(
  '/blocked-ips',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT * FROM blocked_ips
        WHERE expires_at IS NULL OR expires_at > NOW()
        ORDER BY blocked_at DESC`
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Unblock an IP address
 */
router.delete(
  '/blocked-ips/:ipAddress',
  authenticate,
  authorize(['ADMIN', 'SECURITY_ADMIN']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await unblockIP(req.params.ipAddress);

      res.json({
        success: true,
        message: 'IP address unblocked',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
