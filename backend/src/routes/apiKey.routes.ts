import { Router } from 'express';
import { Pool } from 'pg';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth';

export function createApiKeyRoutes(db: Pool): Router {
  const router = Router();
  const controller = new ApiKeyController(db);

  // All routes require authentication
  router.use(authenticate);

  // API key endpoints
  router.post('/', controller.generateApiKey);
  router.get('/', controller.getApiKeys);
  router.get('/:keyId', controller.getApiKey);
  router.put('/:keyId', controller.updateApiKey);
  router.post('/:keyId/revoke', controller.revokeApiKey);
  router.get('/:keyId/usage', controller.getUsageStats);

  return router;
}
