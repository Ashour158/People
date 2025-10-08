// =====================================================
// Feature Flag Service
// Manages feature flags for incremental rollout
// =====================================================

import { Pool } from 'pg';

export interface FeatureFlag {
  flag_id?: string;
  flag_key: string;
  flag_name: string;
  description?: string;
  flag_type: 'boolean' | 'multivariate' | 'percentage';
  default_enabled: boolean;
  default_value?: Record<string, any>;
  targeting_rules?: Record<string, any>;
  variants?: Array<{ key: string; weight: number }>;
  rollout_percentage?: number;
  is_enabled: boolean;
  is_archived?: boolean;
}

export interface FeatureFlagContext {
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  customAttributes?: Record<string, any>;
}

export class FeatureFlagService {
  private cache: Map<string, FeatureFlag> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(private pool: Pool) {}

  // =====================================================
  // FLAG EVALUATION
  // =====================================================

  async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    const flag = await this.getFlag(flagKey);
    
    if (!flag || !flag.flag_id) {
      console.warn(`[FeatureFlagService] Flag not found: ${flagKey}`);
      return false;
    }

    if (flag.is_archived) {
      return false;
    }

    // Check user-level override first
    if (context.userId) {
      const userOverride = await this.getUserOverride(flag.flag_id, context.userId);
      if (userOverride !== null) {
        await this.logEvaluation(flag, context, userOverride);
        return userOverride;
      }
    }

    // Check organization-level override
    if (context.organizationId) {
      const orgOverride = await this.getOrganizationOverride(flag.flag_id, context.organizationId);
      if (orgOverride !== null) {
        await this.logEvaluation(flag, context, orgOverride);
        return orgOverride;
      }
    }

    // Evaluate targeting rules
    if (flag.targeting_rules && Object.keys(flag.targeting_rules).length > 0) {
      const targetingResult = this.evaluateTargetingRules(flag.targeting_rules, context);
      if (targetingResult !== null) {
        await this.logEvaluation(flag, context, targetingResult);
        return targetingResult;
      }
    }

    // Check percentage rollout
    if (flag.rollout_percentage && flag.rollout_percentage > 0 && flag.rollout_percentage < 100) {
      const rolloutResult = this.evaluatePercentageRollout(flagKey, context, flag.rollout_percentage);
      await this.logEvaluation(flag, context, rolloutResult);
      return rolloutResult;
    }

    // Default to flag's enabled status
    const result = flag.is_enabled && flag.default_enabled;
    await this.logEvaluation(flag, context, result);
    return result;
  }

  async getVariant(flagKey: string, context: FeatureFlagContext): Promise<string | null> {
    const flag = await this.getFlag(flagKey);
    
    if (!flag || flag.flag_type !== 'multivariate' || !flag.variants || flag.variants.length === 0) {
      return null;
    }

    if (!await this.isEnabled(flagKey, context)) {
      return null;
    }

    // Use consistent hashing for stable variant assignment
    const hash = this.hashContext(flagKey, context);
    const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);
    const target = hash % totalWeight;

    let cumulative = 0;
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (target < cumulative) {
        await this.logEvaluation(flag, context, true, variant.key);
        return variant.key;
      }
    }

    return flag.variants[0].key;
  }

  // =====================================================
  // FLAG MANAGEMENT
  // =====================================================

  async createFlag(flag: FeatureFlag): Promise<string> {
    const query = `
      INSERT INTO feature_flags (
        flag_key, flag_name, description, flag_type,
        default_enabled, default_value, targeting_rules,
        variants, rollout_percentage, is_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING flag_id
    `;

    const values = [
      flag.flag_key,
      flag.flag_name,
      flag.description,
      flag.flag_type,
      flag.default_enabled,
      JSON.stringify(flag.default_value || {}),
      JSON.stringify(flag.targeting_rules || {}),
      JSON.stringify(flag.variants || []),
      flag.rollout_percentage || 0,
      flag.is_enabled,
    ];

    const result = await this.pool.query(query, values);
    this.invalidateCache();
    return result.rows[0].flag_id;
  }

  async updateFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.flag_name !== undefined) {
      setClauses.push(`flag_name = $${paramIndex++}`);
      values.push(updates.flag_name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.default_enabled !== undefined) {
      setClauses.push(`default_enabled = $${paramIndex++}`);
      values.push(updates.default_enabled);
    }
    if (updates.targeting_rules !== undefined) {
      setClauses.push(`targeting_rules = $${paramIndex++}`);
      values.push(JSON.stringify(updates.targeting_rules));
    }
    if (updates.rollout_percentage !== undefined) {
      setClauses.push(`rollout_percentage = $${paramIndex++}`);
      values.push(updates.rollout_percentage);
    }
    if (updates.is_enabled !== undefined) {
      setClauses.push(`is_enabled = $${paramIndex++}`);
      values.push(updates.is_enabled);
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push(`modified_at = NOW()`);
    values.push(flagId);

    const query = `
      UPDATE feature_flags
      SET ${setClauses.join(', ')}
      WHERE flag_id = $${paramIndex}
    `;

    await this.pool.query(query, values);
    this.invalidateCache();
  }

  async deleteFlag(flagId: string): Promise<void> {
    const query = `
      UPDATE feature_flags
      SET is_archived = TRUE, archived_at = NOW()
      WHERE flag_id = $1
    `;

    await this.pool.query(query, [flagId]);
    this.invalidateCache();
  }

  // =====================================================
  // OVERRIDES
  // =====================================================

  async setOrganizationOverride(
    flagId: string,
    organizationId: string,
    enabled: boolean,
    reason?: string,
    expiresAt?: Date
  ): Promise<void> {
    const query = `
      INSERT INTO feature_flag_overrides (flag_id, organization_id, is_enabled, reason, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (flag_id, organization_id)
      DO UPDATE SET is_enabled = $3, reason = $4, expires_at = $5, modified_at = NOW()
    `;

    await this.pool.query(query, [flagId, organizationId, enabled, reason, expiresAt]);
  }

  async setUserOverride(
    flagId: string,
    userId: string,
    enabled: boolean,
    reason?: string,
    expiresAt?: Date
  ): Promise<void> {
    const query = `
      INSERT INTO feature_flag_user_overrides (flag_id, user_id, is_enabled, reason, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (flag_id, user_id)
      DO UPDATE SET is_enabled = $3, reason = $4, expires_at = $5
    `;

    await this.pool.query(query, [flagId, userId, enabled, reason, expiresAt]);
  }

  async removeOrganizationOverride(flagId: string, organizationId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM feature_flag_overrides WHERE flag_id = $1 AND organization_id = $2',
      [flagId, organizationId]
    );
  }

  async removeUserOverride(flagId: string, userId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM feature_flag_user_overrides WHERE flag_id = $1 AND user_id = $2',
      [flagId, userId]
    );
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  private async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    // Check cache first
    if (Date.now() - this.lastCacheUpdate < this.cacheExpiry && this.cache.has(flagKey)) {
      return this.cache.get(flagKey)!;
    }

    // Load from database
    const query = `
      SELECT * FROM feature_flags
      WHERE flag_key = $1 AND is_archived = FALSE
    `;

    const result = await this.pool.query(query, [flagKey]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const flag = this.mapRowToFlag(result.rows[0]);
    this.cache.set(flagKey, flag);
    
    return flag;
  }

  private async getUserOverride(flagId: string, userId: string): Promise<boolean | null> {
    const query = `
      SELECT is_enabled FROM feature_flag_user_overrides
      WHERE flag_id = $1 AND user_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await this.pool.query(query, [flagId, userId]);
    return result.rows.length > 0 ? result.rows[0].is_enabled : null;
  }

  private async getOrganizationOverride(flagId: string, organizationId: string): Promise<boolean | null> {
    const query = `
      SELECT is_enabled FROM feature_flag_overrides
      WHERE flag_id = $1 AND organization_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await this.pool.query(query, [flagId, organizationId]);
    return result.rows.length > 0 ? result.rows[0].is_enabled : null;
  }

  private evaluateTargetingRules(rules: Record<string, any>, context: FeatureFlagContext): boolean | null {
    // Simple rule evaluation
    // Example rules: {"rules": [{"attribute": "organizationId", "operator": "in", "values": ["uuid1"]}]}
    
    if (!rules.rules || !Array.isArray(rules.rules)) {
      return null;
    }

    for (const rule of rules.rules) {
      const { attribute, operator, values } = rule;
      const contextValue = this.getContextAttribute(context, attribute);

      switch (operator) {
        case 'in':
          if (values.includes(contextValue)) {
            return true;
          }
          break;
        case 'not_in':
          if (!values.includes(contextValue)) {
            return true;
          }
          break;
        case 'equals':
          if (contextValue === values[0]) {
            return true;
          }
          break;
        case 'not_equals':
          if (contextValue !== values[0]) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  private evaluatePercentageRollout(
    flagKey: string,
    context: FeatureFlagContext,
    percentage: number
  ): boolean {
    // Use consistent hashing for stable rollout
    const hash = this.hashContext(flagKey, context);
    return (hash % 100) < percentage;
  }

  private hashContext(flagKey: string, context: FeatureFlagContext): number {
    // Simple hash function for consistent assignment
    const str = `${flagKey}:${context.userId || context.organizationId || 'anonymous'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getContextAttribute(context: FeatureFlagContext, attribute: string): any {
    switch (attribute) {
      case 'organizationId':
        return context.organizationId;
      case 'userId':
        return context.userId;
      case 'userEmail':
        return context.userEmail;
      case 'userRoles':
        return context.userRoles;
      default:
        return context.customAttributes?.[attribute];
    }
  }

  private async logEvaluation(
    flag: FeatureFlag,
    context: FeatureFlagContext,
    result: boolean,
    variant?: string
  ): Promise<void> {
    // Asynchronously log evaluation (fire and forget)
    const query = `
      INSERT INTO feature_flag_evaluations (
        flag_id, organization_id, user_id, evaluated_value, variant_key, evaluation_context
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      flag.flag_id,
      context.organizationId,
      context.userId,
      result,
      variant,
      JSON.stringify({
        userEmail: context.userEmail,
        userRoles: context.userRoles,
        customAttributes: context.customAttributes,
      }),
    ];

    this.pool.query(query, values).catch(error => {
      console.error('[FeatureFlagService] Failed to log evaluation:', error);
    });
  }

  private mapRowToFlag(row: any): FeatureFlag {
    return {
      flag_id: row.flag_id,
      flag_key: row.flag_key,
      flag_name: row.flag_name,
      description: row.description,
      flag_type: row.flag_type,
      default_enabled: row.default_enabled,
      default_value: row.default_value,
      targeting_rules: row.targeting_rules,
      variants: row.variants,
      rollout_percentage: row.rollout_percentage,
      is_enabled: row.is_enabled,
      is_archived: row.is_archived,
    };
  }

  private invalidateCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  async getFlagAnalytics(flagId: string, startDate?: Date, endDate?: Date): Promise<{
    totalEvaluations: number;
    enabledCount: number;
    disabledCount: number;
    variantDistribution?: Record<string, number>;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN evaluated_value = TRUE THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN evaluated_value = FALSE THEN 1 ELSE 0 END) as disabled,
        variant_key
      FROM feature_flag_evaluations
      WHERE flag_id = $1
    `;

    const values: any[] = [flagId];

    if (startDate) {
      values.push(startDate);
      query += ` AND evaluated_at >= $${values.length}`;
    }

    if (endDate) {
      values.push(endDate);
      query += ` AND evaluated_at <= $${values.length}`;
    }

    query += ' GROUP BY variant_key';

    const result = await this.pool.query(query, values);

    const analytics = {
      totalEvaluations: 0,
      enabledCount: 0,
      disabledCount: 0,
      variantDistribution: {} as Record<string, number>,
    };

    for (const row of result.rows) {
      analytics.totalEvaluations += parseInt(row.total);
      analytics.enabledCount += parseInt(row.enabled);
      analytics.disabledCount += parseInt(row.disabled);
      
      if (row.variant_key) {
        analytics.variantDistribution[row.variant_key] = parseInt(row.total);
      }
    }

    return analytics;
  }
}
