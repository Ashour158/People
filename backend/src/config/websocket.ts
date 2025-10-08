// =====================================================
// WebSocket Configuration
// Setup WebSocket server with authentication
// =====================================================

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { env } from './env';
import { logger } from './logger';

interface SocketUser {
  user_id: string;
  employee_id: string;
  organization_id: string;
  company_id?: string;
  email: string;
}

export function setupWebSocket(httpServer: HTTPServer, db: Pool): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.jwt.secret) as SocketUser;
      
      // Attach user info to socket
      socket.data.user = decoded;
      
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`WebSocket connected: ${user.email} (${socket.id})`);

    // Join user-specific rooms
    socket.join(`user:${user.user_id}`);
    socket.join(`org:${user.organization_id}`);
    
    if (user.company_id) {
      socket.join(`company:${user.company_id}`);
    }

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to notification server',
      timestamp: new Date().toISOString()
    });

    // Handle channel subscriptions
    socket.on('subscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.join(channel);
        logger.debug(`User ${user.email} subscribed to ${channel}`);
      });
      socket.emit('subscribed', { channels });
    });

    socket.on('unsubscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.leave(channel);
        logger.debug(`User ${user.email} unsubscribed from ${channel}`);
      });
      socket.emit('unsubscribed', { channels });
    });

    // Handle notification read status
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await db.query(`
          UPDATE notifications
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
          WHERE notification_id = $1 AND user_id = $2
        `, [notificationId, user.user_id]);

        socket.emit('notification:read:success', { notificationId });
        logger.debug(`Notification ${notificationId} marked as read`);
      } catch (error) {
        logger.error('Error marking notification as read:', error);
        socket.emit('notification:read:error', { 
          notificationId, 
          error: 'Failed to mark as read' 
        });
      }
    });

    // Handle mark all as read
    socket.on('notification:read:all', async () => {
      try {
        await db.query(`
          UPDATE notifications
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND is_read = FALSE
        `, [user.user_id]);

        socket.emit('notification:read:all:success');
        logger.debug(`All notifications marked as read for user ${user.user_id}`);
      } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        socket.emit('notification:read:all:error', { 
          error: 'Failed to mark all as read' 
        });
      }
    });

    // Get unread notification count
    socket.on('notification:count', async () => {
      try {
        const result = await db.query(`
          SELECT COUNT(*) as unread_count
          FROM notifications
          WHERE user_id = $1 AND is_read = FALSE AND is_deleted = FALSE
        `, [user.user_id]);

        socket.emit('notification:count:response', {
          unread_count: parseInt(result.rows[0].unread_count)
        });
      } catch (error) {
        logger.error('Error getting notification count:', error);
        socket.emit('notification:count:error', {
          error: 'Failed to get notification count'
        });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${user.email} (${socket.id}) - Reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${user.email}:`, error);
    });
  });

  // Log server start
  logger.info('WebSocket server initialized');

  return io;
}
