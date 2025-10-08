import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

export interface ApiKey {
  api_key_id: string;
  organization_id: string;
  key_name: string;
  key_prefix: string;
  permissions: string[];
  scopes: string[];
  rate_limit_per_hour: number;
  ip_whitelist?: string[];
  expires_at?: Date;
  is_active: boolean;
  last_used_at?: Date;
  created_at: Date;
  created_by: string;
}

export class ApiKeyService {
  constructor(private db: Pool) {}

  /**
   * Generate new API key
   */
  async generateApiKey(data: {
    organization_id: string;
    key_name: string;
    permissions?: string[];
    scopes?: string[];
    rate_limit_per_hour?: number;
    ip_whitelist?: string[];
    expires_at?: Date;
    created_by: string;
  }): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Generate random API key
    const plainKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = plainKey.substring(0, 10);
    
    // Hash the API key for storage
    const keyHash = await bcrypt.hash(plainKey, 10);

    const result = await this.db.query(
      `INSERT INTO api_keys 
       (organization_id, key_name, key_hash, key_prefix, permissions, scopes, 
        rate_limit_per_hour, ip_whitelist, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.organization_id,
        data.key_name,
        keyHash,
        keyPrefix,
        data.permissions || ['read'],
        data.scopes || ['*'],
        data.rate_limit_per_hour || 1000,
        data.ip_whitelist || null,
        data.expires_at || null,
        data.created_by
      ]
    );

    return {
      apiKey: result.rows[0],
      plainKey // Return plain key only once
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    try {
      // Extract prefix to find candidate keys
      const keyPrefix = plainKey.substring(0, 10);

      const result = await this.db.query(
        `SELECT * FROM api_keys 
         WHERE key_prefix = $1 
         AND is_active = TRUE 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [keyPrefix]
      );

      // Check each candidate key
      for (const row of result.rows) {
        const isValid = await bcrypt.compare(plainKey, row.key_hash);
        if (isValid) {
          // Update last used timestamp
          await this.updateLastUsed(row.api_key_id);
          return row;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Get all API keys for organization (without revealing the key)
   */
  async getApiKeys(organizationId: string): Promise<ApiKey[]> {
    const result = await this.db.query(
      `SELECT api_key_id, organization_id, key_name, key_prefix, permissions, scopes,
              rate_limit_per_hour, ip_whitelist, expires_at, is_active, last_used_at,
              created_at, created_by
       FROM api_keys 
       WHERE organization_id = $1 
       AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows;
  }

  /**
   * Get single API key
   */
  async getApiKey(apiKeyId: string, organizationId: string): Promise<ApiKey | null> {
    const result = await this.db.query(
      `SELECT api_key_id, organization_id, key_name, key_prefix, permissions, scopes,
              rate_limit_per_hour, ip_whitelist, expires_at, is_active, last_used_at,
              created_at, created_by
       FROM api_keys 
       WHERE api_key_id = $1 AND organization_id = $2 AND revoked_at IS NULL`,
      [apiKeyId, organizationId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update API key
   */
  async updateApiKey(
    apiKeyId: string,
    organizationId: string,
    data: Partial<{
      key_name: string;
      permissions: string[];
      scopes: string[];
      rate_limit_per_hour: number;
      ip_whitelist: string[];
      is_active: boolean;
    }>
  ): Promise<ApiKey> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.key_name !== undefined) {
      updates.push(`key_name = $${paramIndex++}`);
      values.push(data.key_name);
    }
    if (data.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(data.permissions);
    }
    if (data.scopes !== undefined) {
      updates.push(`scopes = $${paramIndex++}`);
      values.push(data.scopes);
    }
    if (data.rate_limit_per_hour !== undefined) {
      updates.push(`rate_limit_per_hour = $${paramIndex++}`);
      values.push(data.rate_limit_per_hour);
    }
    if (data.ip_whitelist !== undefined) {
      updates.push(`ip_whitelist = $${paramIndex++}`);
      values.push(data.ip_whitelist);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    values.push(apiKeyId, organizationId);

    const result = await this.db.query(
      `UPDATE api_keys 
       SET ${updates.join(', ')}
       WHERE api_key_id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    apiKeyId: string,
    organizationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE api_keys 
       SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $1, revoke_reason = $2, is_active = FALSE
       WHERE api_key_id = $3 AND organization_id = $4`,
      [revokedBy, reason || null, apiKeyId, organizationId]
    );
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    resetAt: Date;
  }> {
    // Get API key rate limit
    const keyResult = await this.db.query(
      `SELECT rate_limit_per_hour FROM api_keys WHERE api_key_id = $1`,
      [apiKeyId]
    );

    if (keyResult.rows.length === 0) {
      return { allowed: false, limit: 0, current: 0, resetAt: new Date() };
    }

    const limit = keyResult.rows[0].rate_limit_per_hour;
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    // Get or create rate limit record
    const result = await this.db.query(
      `INSERT INTO integration_rate_limits 
       (integration_type, integration_id, window_start, window_size_minutes, limit_threshold, request_count)
       VALUES ('api_key', $1, $2, 60, $3, 1)
       ON CONFLICT (integration_type, integration_id, window_start)
       DO UPDATE SET request_count = integration_rate_limits.request_count + 1
       RETURNING request_count`,
      [apiKeyId, windowStart, limit]
    );

    const current = result.rows[0].request_count;
    const resetAt = new Date(windowStart);
    resetAt.setHours(resetAt.getHours() + 1);

    return {
      allowed: current <= limit,
      limit,
      current,
      resetAt
    };
  }

  /**
   * Log API key usage
   */
  async logUsage(data: {
    api_key_id: string;
    endpoint: string;
    method: string;
    status_code: number;
    ip_address?: string;
    user_agent?: string;
    response_time_ms?: number;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO api_key_usage 
         (api_key_id, endpoint, method, status_code, ip_address, user_agent, response_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.api_key_id,
          data.endpoint,
          data.method,
          data.status_code,
          data.ip_address || null,
          data.user_agent || null,
          data.response_time_ms || null
        ]
      );
    } catch (error) {
      logger.error('Error logging API key usage:', error);
    }
  }

  /**
   * Get usage statistics for API key
   */
  async getUsageStats(
    apiKeyId: string,
    days: number = 7
  ): Promise<{
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number;
    requests_by_day: Array<{ date: string; count: number }>;
  }> {
    const result = await this.db.query(
      `SELECT 
         COUNT(*) as total_requests,
         COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_requests,
         COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
         AVG(response_time_ms)::INTEGER as avg_response_time_ms
       FROM api_key_usage
       WHERE api_key_id = $1 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'`,
      [apiKeyId]
    );

    const dailyResult = await this.db.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as count
       FROM api_key_usage
       WHERE api_key_id = $1 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [apiKeyId]
    );

    return {
      total_requests: parseInt(result.rows[0].total_requests || '0'),
      successful_requests: parseInt(result.rows[0].successful_requests || '0'),
      failed_requests: parseInt(result.rows[0].failed_requests || '0'),
      avg_response_time_ms: result.rows[0].avg_response_time_ms || 0,
      requests_by_day: dailyResult.rows
    };
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE api_key_id = $1`,
        [apiKeyId]
      );
    } catch (error) {
      logger.error('Error updating API key last used:', error);
    }
  }

  /**
   * Check if IP is whitelisted for API key
   */
  checkIpWhitelist(apiKey: ApiKey, ipAddress: string): boolean {
    if (!apiKey.ip_whitelist || apiKey.ip_whitelist.length === 0) {
      return true; // No whitelist means all IPs allowed
    }

    return apiKey.ip_whitelist.includes(ipAddress);
  }

  /**
   * Check if API key has required permission
   */
  hasPermission(apiKey: ApiKey, permission: string): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('*');
  }

  /**
   * Check if API key can access scope
   */
  canAccessScope(apiKey: ApiKey, scope: string): boolean {
    return apiKey.scopes.includes(scope) || apiKey.scopes.includes('*');
  }
}
