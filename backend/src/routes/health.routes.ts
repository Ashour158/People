// =====================================================
// Health Check Routes
// Check status of all infrastructure services
// =====================================================

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { emailService, cacheService } from '../services';

const router = Router();

/**
 * Overall health check
 */
router.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      cache: 'unknown',
      email: 'unknown',
      websocket: 'unknown',
    },
  };

  try {
    // Check database
    try {
      await pool.query('SELECT 1');
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check cache
    try {
      const cacheHealthy = await cacheService.ping();
      health.services.cache = cacheHealthy ? 'healthy' : 'unhealthy';
      if (!cacheHealthy) {health.status = 'degraded';}
    } catch (error) {
      health.services.cache = 'unhealthy';
      health.status = 'degraded';
    }

    // Check email
    try {
      const emailHealthy = await emailService.verifyConnection();
      health.services.email = emailHealthy ? 'healthy' : 'unavailable';
    } catch (error) {
      health.services.email = 'unhealthy';
    }

    // Check WebSocket
    const notificationService = req.app.get('notificationService');
    health.services.websocket = notificationService ? 'healthy' : 'disabled';

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Database health check
 */
router.get('/health/database', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    await pool.query('SELECT NOW()');
    const responseTime = Date.now() - start;

    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cache health check
 */
router.get('/health/cache', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const healthy = await cacheService.ping();
    const responseTime = Date.now() - start;

    if (healthy) {
      res.json({
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Cache service not responding',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Cache connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Email service health check
 */
router.get('/health/email', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const healthy = await emailService.verifyConnection();
    const responseTime = Date.now() - start;

    if (healthy) {
      res.json({
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.json({
        status: 'unavailable',
        message: 'Email service not configured',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Email service check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * WebSocket service health check
 */
router.get('/health/websocket', (req: Request, res: Response) => {
  const notificationService = req.app.get('notificationService');

  if (notificationService) {
    res.json({
      status: 'healthy',
      message: 'WebSocket service is active',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.json({
      status: 'disabled',
      message: 'WebSocket service is not enabled',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness check (for Kubernetes)
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * Liveness check (for Kubernetes)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
