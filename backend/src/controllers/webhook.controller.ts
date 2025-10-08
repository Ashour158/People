import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { WebhookService } from '../services/webhook.service';

export class WebhookController {
  private webhookService: WebhookService;

  constructor(db: Pool) {
    this.webhookService = new WebhookService(db);
  }

  /**
   * Register new webhook
   */
  registerWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, url, events, headers, timeout_seconds } = req.body;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;

      const webhook = await this.webhookService.registerWebhook({
        organization_id: organizationId,
        name,
        url,
        events,
        headers,
        timeout_seconds,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        message: 'Webhook registered successfully',
        data: {
          ...webhook,
          secret_key: webhook.secret_key // Only shown on creation
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all webhooks
   */
  getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user.organization_id;

      const webhooks = await this.webhookService.getWebhooks(organizationId);

      // Don't include secret_key in list response
      const sanitized = webhooks.map(({ secret_key, ...rest }) => rest);

      res.json({
        success: true,
        data: sanitized,
        count: sanitized.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single webhook
   */
  getWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookId } = req.params;
      const organizationId = (req as any).user.organization_id;

      const webhooks = await this.webhookService.getWebhooks(organizationId);
      const webhook = webhooks.find(w => w.webhook_id === webhookId);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found'
        });
      }

      // Don't include secret_key
      const { secret_key, ...sanitized } = webhook;

      res.json({
        success: true,
        data: sanitized
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update webhook
   */
  updateWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookId } = req.params;
      const { name, url, events, is_active, headers } = req.body;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;

      const webhook = await this.webhookService.updateWebhook(
        webhookId,
        organizationId,
        {
          name,
          url,
          events,
          is_active,
          headers,
          modified_by: userId
        }
      );

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found'
        });
      }

      const { secret_key, ...sanitized } = webhook;

      res.json({
        success: true,
        message: 'Webhook updated successfully',
        data: sanitized
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete webhook
   */
  deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookId } = req.params;
      const organizationId = (req as any).user.organization_id;

      await this.webhookService.deleteWebhook(webhookId, organizationId);

      res.json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get webhook deliveries
   */
  getDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookId } = req.params;
      const { limit, offset, status } = req.query;

      const deliveries = await this.webhookService.getDeliveries(webhookId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        status: status as string
      });

      res.json({
        success: true,
        data: deliveries,
        count: deliveries.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Test webhook
   */
  testWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookId } = req.params;
      const organizationId = (req as any).user.organization_id;

      // Trigger a test event
      await this.webhookService.triggerEvent({
        event_type: 'webhook.test',
        organization_id: organizationId,
        data: {
          message: 'This is a test webhook event',
          webhook_id: webhookId
        },
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Test webhook triggered successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
