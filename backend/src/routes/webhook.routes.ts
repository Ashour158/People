import { Router } from 'express';
import { Pool } from 'pg';
import { WebhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth';

export function createWebhookRoutes(db: Pool): Router {
  const router = Router();
  const controller = new WebhookController(db);

  // All routes require authentication
  router.use(authenticate);

  // Webhook endpoints
  router.post('/', controller.registerWebhook);
  router.get('/', controller.getWebhooks);
  router.get('/:webhookId', controller.getWebhook);
  router.put('/:webhookId', controller.updateWebhook);
  router.delete('/:webhookId', controller.deleteWebhook);
  router.post('/:webhookId/test', controller.testWebhook);
  router.get('/:webhookId/deliveries', controller.getDeliveries);

  return router;
}
