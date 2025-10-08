import { query } from '../config/database';
import { logger } from '../config/logger';
import { getAuditLogs, AuditSeverity, AuditEventType } from './auditLog.service';

/**
 * Security Monitoring Service
 * Provides security metrics, alerts, and monitoring capabilities
 */

export interface SecurityMetrics {
  failedLogins: number;
  suspiciousActivity: number;
  blockedIPs: number;
  activeSessions: number;
  mfaEnabled: number;
  recentAlerts: any[];
  vulnerabilityCount: number;
}

export interface SecurityAlert {
  alertId: string;
  severity: AuditSeverity;
  type: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Get security metrics for an organization
 */
export async function getSecurityMetrics(
  organizationId: string,
  timeframe: 'day' | 'week' | 'month' = 'day'
): Promise<SecurityMetrics> {
  try {
    const intervalMap = {
      day: '24 hours',
      week: '7 days',
      month: '30 days',
    };
    const interval = intervalMap[timeframe];

    // Failed logins in timeframe
    const failedLoginsResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs
      WHERE organization_id = $1 
        AND event_type = $2
        AND created_at > NOW() - INTERVAL '${interval}'`,
      [organizationId, AuditEventType.LOGIN_FAILED]
    );

    // Suspicious activity events
    const suspiciousActivityResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs
      WHERE organization_id = $1 
        AND event_type = $2
        AND created_at > NOW() - INTERVAL '${interval}'`,
      [organizationId, AuditEventType.SUSPICIOUS_ACTIVITY]
    );

    // Blocked IPs
    const blockedIPsResult = await query(
      `SELECT COUNT(*) as count FROM blocked_ips
      WHERE (expires_at IS NULL OR expires_at > NOW())`
    );

    // Active sessions
    const activeSessionsResult = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM login_history
      WHERE organization_id = $1 
        AND login_status = 'success'
        AND logout_timestamp IS NULL
        AND login_timestamp > NOW() - INTERVAL '24 hours'`,
      [organizationId]
    );

    // MFA enabled users
    const mfaEnabledResult = await query(
      `SELECT COUNT(*) as count FROM users
      WHERE organization_id = $1 
        AND mfa_enabled = TRUE
        AND is_deleted = FALSE`,
      [organizationId]
    );

    // Recent critical alerts
    const recentAlertsResult = await query(
      `SELECT * FROM audit_logs
      WHERE organization_id = $1 
        AND severity = $2
        AND created_at > NOW() - INTERVAL '${interval}'
      ORDER BY created_at DESC
      LIMIT 10`,
      [organizationId, AuditSeverity.CRITICAL]
    );

    return {
      failedLogins: parseInt(failedLoginsResult.rows[0].count),
      suspiciousActivity: parseInt(suspiciousActivityResult.rows[0].count),
      blockedIPs: parseInt(blockedIPsResult.rows[0].count),
      activeSessions: parseInt(activeSessionsResult.rows[0].count),
      mfaEnabled: parseInt(mfaEnabledResult.rows[0].count),
      recentAlerts: recentAlertsResult.rows,
      vulnerabilityCount: 0, // To be implemented with vulnerability scanning
    };
  } catch (error) {
    logger.error('Failed to get security metrics', { error, organizationId });
    throw error;
  }
}

/**
 * Get security dashboard data
 */
export async function getSecurityDashboard(organizationId: string) {
  try {
    const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
      getSecurityMetrics(organizationId, 'day'),
      getSecurityMetrics(organizationId, 'week'),
      getSecurityMetrics(organizationId, 'month'),
    ]);

    // Get failed login trend
    const loginTrendResult = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = $1 
        AND event_type = $2
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [organizationId, AuditEventType.LOGIN_FAILED]
    );

    // Get top risky users (most failed logins)
    const riskyUsersResult = await query(
      `SELECT 
        u.user_id,
        u.email,
        u.username,
        COUNT(*) as failed_login_count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.user_id
      WHERE al.organization_id = $1 
        AND al.event_type = $2
        AND al.created_at > NOW() - INTERVAL '7 days'
      GROUP BY u.user_id, u.email, u.username
      ORDER BY failed_login_count DESC
      LIMIT 5`,
      [organizationId, AuditEventType.LOGIN_FAILED]
    );

    return {
      metrics: {
        daily: dailyMetrics,
        weekly: weeklyMetrics,
        monthly: monthlyMetrics,
      },
      trends: {
        loginFailures: loginTrendResult.rows,
      },
      riskyUsers: riskyUsersResult.rows,
    };
  } catch (error) {
    logger.error('Failed to get security dashboard', { error, organizationId });
    throw error;
  }
}

/**
 * Check for security vulnerabilities
 */
export async function checkSecurityVulnerabilities(
  organizationId: string
): Promise<any[]> {
  const vulnerabilities: any[] = [];

  try {
    // Check for users without MFA
    const noMFAResult = await query(
      `SELECT COUNT(*) as count FROM users
      WHERE organization_id = $1 
        AND mfa_enabled = FALSE
        AND is_deleted = FALSE`,
      [organizationId]
    );

    if (parseInt(noMFAResult.rows[0].count) > 0) {
      vulnerabilities.push({
        type: 'MFA_NOT_ENABLED',
        severity: 'HIGH',
        description: `${noMFAResult.rows[0].count} users do not have MFA enabled`,
        recommendation: 'Enable MFA for all users',
      });
    }

    // Check for weak password policy
    const weakPasswordResult = await query(
      `SELECT password_min_length, password_require_special_chars
      FROM organizations
      WHERE organization_id = $1`,
      [organizationId]
    );

    if (weakPasswordResult.rows.length > 0) {
      const policy = weakPasswordResult.rows[0];
      if (policy.password_min_length < 12) {
        vulnerabilities.push({
          type: 'WEAK_PASSWORD_POLICY',
          severity: 'MEDIUM',
          description: 'Password minimum length is less than 12 characters',
          recommendation: 'Set minimum password length to at least 12 characters',
        });
      }
    }

    // Check for inactive sessions
    const inactiveSessionsResult = await query(
      `SELECT COUNT(*) as count FROM login_history
      WHERE organization_id = $1 
        AND login_status = 'success'
        AND logout_timestamp IS NULL
        AND login_timestamp < NOW() - INTERVAL '7 days'`,
      [organizationId]
    );

    if (parseInt(inactiveSessionsResult.rows[0].count) > 0) {
      vulnerabilities.push({
        type: 'INACTIVE_SESSIONS',
        severity: 'LOW',
        description: `${inactiveSessionsResult.rows[0].count} sessions have been active for more than 7 days`,
        recommendation: 'Implement session timeout policy',
      });
    }

    // Check for IP whitelisting not enabled
    const ipWhitelistResult = await query(
      `SELECT enable_ip_whitelist FROM organizations
      WHERE organization_id = $1`,
      [organizationId]
    );

    if (
      ipWhitelistResult.rows.length > 0 &&
      !ipWhitelistResult.rows[0].enable_ip_whitelist
    ) {
      vulnerabilities.push({
        type: 'IP_WHITELIST_DISABLED',
        severity: 'MEDIUM',
        description: 'IP whitelisting is not enabled',
        recommendation: 'Enable IP whitelisting for additional security',
      });
    }

    logger.info('Security vulnerability check completed', {
      organizationId,
      vulnerabilityCount: vulnerabilities.length,
    });

    return vulnerabilities;
  } catch (error) {
    logger.error('Failed to check security vulnerabilities', {
      error,
      organizationId,
    });
    return vulnerabilities;
  }
}

/**
 * Generate security report
 */
export async function generateSecurityReport(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    // Get all audit logs for the period
    const auditLogs = await getAuditLogs({
      organizationId,
      startDate,
      endDate,
      limit: 10000,
    });

    // Aggregate by event type
    const eventTypeCounts = auditLogs.logs.reduce((acc: any, log: any) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1;
      return acc;
    }, {});

    // Aggregate by severity
    const severityCounts = auditLogs.logs.reduce((acc: any, log: any) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {});

    // Get top users by activity
    const userActivityResult = await query(
      `SELECT 
        user_id,
        COUNT(*) as activity_count
      FROM audit_logs
      WHERE organization_id = $1 
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY user_id
      ORDER BY activity_count DESC
      LIMIT 10`,
      [organizationId, startDate, endDate]
    );

    return {
      period: {
        startDate,
        endDate,
      },
      totalEvents: auditLogs.total,
      eventTypeCounts,
      severityCounts,
      topActiveUsers: userActivityResult.rows,
      vulnerabilities: await checkSecurityVulnerabilities(organizationId),
    };
  } catch (error) {
    logger.error('Failed to generate security report', {
      error,
      organizationId,
    });
    throw error;
  }
}
