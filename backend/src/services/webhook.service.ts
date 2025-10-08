import { Pool } from 'pg';
import * as crypto from 'crypto';
import axios from 'axios';
import { logger } from '../config/logger';

export interface WebhookEndpoint {
  webhook_id: string;
  organization_id: string;
  name: string;
  url: string;
  secret_key: string;
  events: string[];
  is_active: boolean;
  retry_policy: {
    max_attempts: number;
    backoff: 'linear' | 'exponential';
  };
  headers?: Record<string, string>;
  timeout_seconds: number;
}

export interface WebhookEvent {
  event_type: string;
  organization_id: string;
  data: any;
  timestamp: string;
}

export class WebhookService {
  constructor(private db: Pool) {}

  /**
   * Register a new webhook endpoint
   */
  async registerWebhook(data: {
    organization_id: string;
    name: string;
    url: string;
    events: string[];
    created_by: string;
    headers?: Record<string, string>;
    timeout_seconds?: number;
  }): Promise<WebhookEndpoint> {
    const secret_key = this.generateSecretKey();
    const retry_policy = { max_attempts: 3, backoff: 'exponential' as const };

    const result = await this.db.query(
      `INSERT INTO webhook_endpoints 
       (organization_id, name, url, secret_key, events, retry_policy, headers, timeout_seconds, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.organization_id,
        data.name,
        data.url,
        secret_key,
        data.events,
        JSON.stringify(retry_policy),
        JSON.stringify(data.headers || {}),
        data.timeout_seconds || 30,
        data.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Get all webhooks for an organization
   */
  async getWebhooks(organizationId: string): Promise<WebhookEndpoint[]> {
    const result = await this.db.query(
      `SELECT * FROM webhook_endpoints 
       WHERE organization_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows;
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(
    webhookId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      url: string;
      events: string[];
      is_active: boolean;
      headers: Record<string, string>;
      modified_by: string;
    }>
  ): Promise<WebhookEndpoint> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }
    if (data.events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      values.push(data.events);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }
    if (data.headers !== undefined) {
      updates.push(`headers = $${paramIndex++}`);
      values.push(JSON.stringify(data.headers));
    }
    if (data.modified_by !== undefined) {
      updates.push(`modified_by = $${paramIndex++}`);
      values.push(data.modified_by);
    }

    updates.push(`modified_at = CURRENT_TIMESTAMP`);
    values.push(webhookId, organizationId);

    const result = await this.db.query(
      `UPDATE webhook_endpoints 
       SET ${updates.join(', ')}
       WHERE webhook_id = $${paramIndex++} AND organization_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete webhook endpoint (soft delete)
   */
  async deleteWebhook(webhookId: string, organizationId: string): Promise<void> {
    await this.db.query(
      `UPDATE webhook_endpoints 
       SET is_deleted = TRUE, modified_at = CURRENT_TIMESTAMP
       WHERE webhook_id = $1 AND organization_id = $2`,
      [webhookId, organizationId]
    );
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    try {
      // Find all active webhooks subscribed to this event type
      const result = await this.db.query(
        `SELECT * FROM webhook_endpoints 
         WHERE organization_id = $1 
         AND is_active = TRUE 
         AND is_deleted = FALSE
         AND $2 = ANY(events)`,
        [event.organization_id, event.event_type]
      );

      const webhooks = result.rows as WebhookEndpoint[];

      // Trigger each webhook asynchronously
      for (const webhook of webhooks) {
        this.deliverWebhook(webhook, event).catch(error => {
          logger.error('Error delivering webhook:', { error, webhook_id: webhook.webhook_id });
        });
      }
    } catch (error) {
      logger.error('Error triggering webhook event:', error);
      throw error;
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    webhook: WebhookEndpoint,
    event: WebhookEvent,
    attemptNumber: number = 1
  ): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const payload = {
      event_id: crypto.randomUUID(),
      event_type: event.event_type,
      timestamp: event.timestamp,
      data: event.data
    };

    try {
      // Create delivery record
      await this.db.query(
        `INSERT INTO webhook_deliveries 
         (delivery_id, webhook_id, event_type, payload, status, attempt_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [deliveryId, webhook.webhook_id, event.event_type, JSON.stringify(payload), 'pending', attemptNumber]
      );

      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret_key);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event.event_type,
        'X-Webhook-Delivery': deliveryId,
        'User-Agent': 'People-HR-Webhooks/1.0',
        ...webhook.headers
      };

      // Send webhook
      const startTime = Date.now();
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout_seconds * 1000,
        validateStatus: () => true // Don't throw on any status
      });
      const duration = Date.now() - startTime;

      // Update delivery record
      await this.db.query(
        `UPDATE webhook_deliveries 
         SET status = $1, response_status_code = $2, response_body = $3, delivered_at = CURRENT_TIMESTAMP
         WHERE delivery_id = $4`,
        [
          response.status >= 200 && response.status < 300 ? 'delivered' : 'failed',
          response.status,
          JSON.stringify(response.data).substring(0, 5000),
          deliveryId
        ]
      );

      // Update last triggered timestamp
      await this.db.query(
        `UPDATE webhook_endpoints SET last_triggered_at = CURRENT_TIMESTAMP WHERE webhook_id = $1`,
        [webhook.webhook_id]
      );

      // If failed and retries available, schedule retry
      if (response.status < 200 || response.status >= 300) {
        if (attemptNumber < webhook.retry_policy.max_attempts) {
          const retryDelay = this.calculateRetryDelay(attemptNumber, webhook.retry_policy.backoff);
          setTimeout(() => {
            this.deliverWebhook(webhook, event, attemptNumber + 1);
          }, retryDelay);
        }
      }

      // Log integration
      await this.logIntegration({
        organization_id: webhook.organization_id,
        integration_type: 'webhook',
        integration_id: webhook.webhook_id,
        event_type: event.event_type,
        status: response.status >= 200 && response.status < 300 ? 'success' : 'failure',
        request_data: payload,
        response_data: response.data,
        duration_ms: duration
      });

    } catch (error: any) {
      logger.error('Webhook delivery failed:', { error, webhook_id: webhook.webhook_id, attempt: attemptNumber });

      // Update delivery record with error
      await this.db.query(
        `UPDATE webhook_deliveries 
         SET status = $1, error_message = $2
         WHERE delivery_id = $3`,
        ['failed', error.message, deliveryId]
      );

      // Retry if attempts remaining
      if (attemptNumber < webhook.retry_policy.max_attempts) {
        const retryDelay = this.calculateRetryDelay(attemptNumber, webhook.retry_policy.backoff);
        setTimeout(() => {
          this.deliverWebhook(webhook, event, attemptNumber + 1);
        }, retryDelay);
      }

      // Log integration error
      await this.logIntegration({
        organization_id: webhook.organization_id,
        integration_type: 'webhook',
        integration_id: webhook.webhook_id,
        event_type: event.event_type,
        status: 'failure',
        request_data: payload,
        error_message: error.message
      });
    }
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(
    webhookId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0, status } = options;
    
    let query = `SELECT * FROM webhook_deliveries WHERE webhook_id = $1`;
    const values: any[] = [webhookId];
    
    if (status) {
      query += ` AND status = $${values.length + 1}`;
      values.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Generate secret key for webhook
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secretKey: string): string {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secretKey: string): boolean {
    const expectedSignature = this.generateSignature(payload, secretKey);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Calculate retry delay based on attempt number and backoff strategy
   */
  private calculateRetryDelay(attemptNumber: number, backoff: 'linear' | 'exponential'): number {
    if (backoff === 'exponential') {
      return Math.pow(2, attemptNumber) * 1000; // 2s, 4s, 8s, etc.
    } else {
      return attemptNumber * 5000; // 5s, 10s, 15s, etc.
    }
  }

  /**
   * Log integration activity
   */
  private async logIntegration(data: {
    organization_id: string;
    integration_type: string;
    integration_id: string;
    event_type: string;
    status: string;
    request_data?: any;
    response_data?: any;
    error_message?: string;
    duration_ms?: number;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO integration_logs 
         (organization_id, integration_type, integration_id, event_type, status, request_data, response_data, error_message, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          data.organization_id,
          data.integration_type,
          data.integration_id,
          data.event_type,
          data.status,
          JSON.stringify(data.request_data || {}),
          JSON.stringify(data.response_data || {}),
          data.error_message || null,
          data.duration_ms || null
        ]
      );
    } catch (error) {
      logger.error('Error logging integration activity:', error);
    }
  }
}
