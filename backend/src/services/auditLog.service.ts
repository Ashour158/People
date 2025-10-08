import { query } from '../config/database';
import { logger } from '../config/logger';
import { Request } from 'express';

/**
 * Advanced Audit Logging Service
 * Tracks security events, data changes, and user actions
 */

export enum AuditEventType {
  // Authentication events
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  
  // Authorization events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // Data events
  DATA_CREATED = 'DATA_CREATED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_VIEWED = 'DATA_VIEWED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Configuration events
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  organizationId?: string;
  targetUserId?: string;
  targetResource?: string;
  targetResourceId?: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
    fields?: string[];
  };
}

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
 * Log an audit event
 */
export async function logAuditEvent(
  entry: AuditLogEntry,
  req?: Request
): Promise<void> {
  try {
    const ipAddress = entry.ipAddress || (req ? getClientIP(req) : 'system');
    const userAgent = entry.userAgent || req?.headers['user-agent'] || 'system';

    await query(
      `INSERT INTO audit_logs (
        organization_id,
        user_id,
        event_type,
        severity,
        target_user_id,
        target_resource,
        target_resource_id,
        action,
        description,
        ip_address,
        user_agent,
        metadata,
        changes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        entry.organizationId,
        entry.userId,
        entry.eventType,
        entry.severity,
        entry.targetUserId,
        entry.targetResource,
        entry.targetResourceId,
        entry.action,
        entry.description,
        ipAddress,
        userAgent,
        JSON.stringify(entry.metadata || {}),
        JSON.stringify(entry.changes || {}),
      ]
    );

    // Also log to Winston for immediate monitoring
    logger.info('Audit event', {
      eventType: entry.eventType,
      severity: entry.severity,
      userId: entry.userId,
      action: entry.action,
      ipAddress,
    });

    // Send alert for critical events
    if (entry.severity === AuditSeverity.CRITICAL) {
      await sendSecurityAlert(entry, ipAddress);
    }
  } catch (error) {
    logger.error('Failed to log audit event', { error, entry });
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  userId: string | undefined,
  organizationId: string | undefined,
  success: boolean,
  req?: Request,
  metadata?: Record<string, any>
): Promise<void> {
  const severity = success ? AuditSeverity.LOW : AuditSeverity.MEDIUM;
  
  await logAuditEvent(
    {
      eventType,
      severity,
      userId,
      organizationId,
      action: eventType,
      description: `User ${success ? 'successfully' : 'failed to'} ${eventType.toLowerCase()}`,
      metadata,
    },
    req
  );
}

/**
 * Log data access event
 */
export async function logDataAccess(
  userId: string,
  organizationId: string,
  resource: string,
  resourceId: string,
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT',
  req?: Request,
  changes?: { before?: any; after?: any; fields?: string[] }
): Promise<void> {
  const eventTypeMap = {
    VIEW: AuditEventType.DATA_VIEWED,
    CREATE: AuditEventType.DATA_CREATED,
    UPDATE: AuditEventType.DATA_UPDATED,
    DELETE: AuditEventType.DATA_DELETED,
    EXPORT: AuditEventType.DATA_EXPORTED,
  };

  await logAuditEvent(
    {
      eventType: eventTypeMap[action],
      severity: action === 'DELETE' ? AuditSeverity.HIGH : AuditSeverity.LOW,
      userId,
      organizationId,
      targetResource: resource,
      targetResourceId: resourceId,
      action,
      description: `User ${action.toLowerCase()}ed ${resource}`,
      changes,
    },
    req
  );
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  severity: AuditSeverity,
  description: string,
  userId?: string,
  organizationId?: string,
  req?: Request,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent(
    {
      eventType,
      severity,
      userId,
      organizationId,
      action: eventType,
      description,
      metadata,
    },
    req
  );
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: {
  organizationId?: string;
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (filters.organizationId) {
    conditions.push(`organization_id = $${paramCount++}`);
    params.push(filters.organizationId);
  }

  if (filters.userId) {
    conditions.push(`user_id = $${paramCount++}`);
    params.push(filters.userId);
  }

  if (filters.eventType) {
    conditions.push(`event_type = $${paramCount++}`);
    params.push(filters.eventType);
  }

  if (filters.severity) {
    conditions.push(`severity = $${paramCount++}`);
    params.push(filters.severity);
  }

  if (filters.startDate) {
    conditions.push(`created_at >= $${paramCount++}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`created_at <= $${paramCount++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
    params
  );

  return {
    logs: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(
  entry: AuditLogEntry,
  ipAddress: string
): Promise<void> {
  logger.warn('CRITICAL SECURITY EVENT', {
    eventType: entry.eventType,
    userId: entry.userId,
    organizationId: entry.organizationId,
    description: entry.description,
    ipAddress,
    metadata: entry.metadata,
  });

  // TODO: Implement email/SMS/Slack notification for security team
  // This could integrate with your notification service
}

/**
 * Clean up old audit logs (for retention policy)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 365): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      RETURNING audit_log_id`
    );

    const deletedCount = result.rowCount || 0;
    logger.info('Cleaned up old audit logs', { deletedCount, retentionDays });
    return deletedCount;
  } catch (error) {
    logger.error('Failed to clean up audit logs', { error });
    return 0;
  }
}
