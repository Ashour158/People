import { Router } from 'express';
import { Pool } from 'pg';
import { OAuthController } from '../controllers/oauth.controller';
import { authenticate } from '../middleware/auth';

export function createOAuthRoutes(db: Pool): Router {
  const router = Router();
  const controller = new OAuthController(db);

  // Public routes
  router.get('/providers', controller.getProviders);

  // Protected routes
  router.get('/authorize/:provider', authenticate, controller.authorize);
  router.get('/callback/:provider', controller.callback);
  router.get('/connected', authenticate, controller.getConnectedAccounts);
  router.post('/disconnect/:provider', authenticate, controller.disconnect);

  // Admin routes
  router.post('/providers', authenticate, controller.registerProvider);

  return router;
}
