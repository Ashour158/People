import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { setupWebSocket } from './config/websocket';
import { createNotificationService, emailService, cacheService, uploadService } from './services';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✅ Database connected successfully');

    // Connect to Redis (optional, non-blocking)
    try {
      await connectRedis();
      logger.info('✅ Redis connected successfully');
      
      // Verify cache service
      const cacheAvailable = await cacheService.ping();
      if (cacheAvailable) {
        logger.info('✅ Cache service operational');
      }
    } catch (redisError) {
      logger.warn('⚠️  Redis connection failed, continuing without cache:', redisError);
    }

    // Initialize upload service directories
    logger.info('✅ Upload service initialized');

    // Verify email service
    const emailVerified = await emailService.verifyConnection();
    if (emailVerified) {
      logger.info('✅ Email service connected');
    } else {
      logger.warn('⚠️  Email service not configured or unavailable');
    }

    // Setup WebSocket if enabled
    if (process.env.WS_ENABLED !== 'false') {
      const io = setupWebSocket(httpServer, pool);
      const notificationService = createNotificationService(io, pool);
      
      // Make notification service available to routes
      app.set('notificationService', notificationService);
      logger.info('✅ WebSocket server initialized');
    } else {
      logger.info('⚠️  WebSocket disabled');
    }

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📡 API Version: ${process.env.API_VERSION || 'v1'}`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  await pool.end();
  logger.info('Database connections closed');
  
  // Disconnect cache service
  await cacheService.disconnect();
  logger.info('Cache service disconnected');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  await pool.end();
  await cacheService.disconnect();
  
  process.exit(0);
});

startServer();
