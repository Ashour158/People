// =====================================================
// Notification Service - WebSocket and Database
// Handles real-time and persistent notifications
// =====================================================

import { Server as SocketIOServer } from 'socket.io';
import { Pool } from 'pg';
import { logger } from '../config/logger';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationRecord {
  notification_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  data: any;
  priority: string;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export class NotificationService {
  constructor(private io: SocketIOServer, private db: Pool) {}

  /**
   * Send notification to specific user
   */
  async notifyUser(userId: string, notification: NotificationPayload): Promise<NotificationRecord | null> {
    try {
      // Save to database
      const result = await this.db.query(`
        INSERT INTO notifications (
          user_id, notification_type, title, message, data, priority
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data || {}),
        notification.priority || 'normal'
      ]);

      const savedNotification = result.rows[0];

      // Send via WebSocket
      this.io.to(`user:${userId}`).emit('notification', {
        ...savedNotification,
        timestamp: new Date().toISOString()
      });

      logger.info(`Notification sent to user ${userId}: ${notification.type}`);
      return savedNotification;
    } catch (error) {
      logger.error('Error sending notification to user:', error);
      return null;
    }
  }

  /**
   * Send notification to multiple users
   */
  async notifyUsers(userIds: string[], notification: NotificationPayload): Promise<void> {
    const promises = userIds.map(userId => this.notifyUser(userId, notification));
    await Promise.allSettled(promises);
  }

  /**
   * Send notification to entire organization
   */
  async notifyOrganization(organizationId: string, notification: NotificationPayload): Promise<void> {
    try {
      // Get all active users in organization
      const result = await this.db.query(`
        SELECT user_id FROM users 
        WHERE organization_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `, [organizationId]);

      const userIds = result.rows.map(row => row.user_id);
      
      // Save notifications for all users
      await this.notifyUsers(userIds, notification);

      // Also broadcast to organization room for real-time delivery
      this.io.to(`org:${organizationId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });

      logger.info(`Organization notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Error notifying organization:', error);
    }
  }

  /**
   * Send notification to company
   */
  async notifyCompany(companyId: string, notification: NotificationPayload): Promise<void> {
    try {
      // Get all active users in company
      const result = await this.db.query(`
        SELECT user_id FROM users 
        WHERE company_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `, [companyId]);

      const userIds = result.rows.map(row => row.user_id);
      await this.notifyUsers(userIds, notification);

      // Broadcast to company room
      this.io.to(`company:${companyId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });

      logger.info(`Company notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Error notifying company:', error);
    }
  }

  /**
   * Send notification to department
   */
  async notifyDepartment(departmentId: string, notification: NotificationPayload): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT DISTINCT u.user_id 
        FROM users u
        JOIN employees e ON u.employee_id = e.employee_id
        WHERE e.department_id = $1 
          AND u.is_active = TRUE 
          AND u.is_deleted = FALSE
          AND e.is_deleted = FALSE
      `, [departmentId]);

      const userIds = result.rows.map(row => row.user_id);
      await this.notifyUsers(userIds, notification);

      logger.info(`Department notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Error notifying department:', error);
    }
  }

  /**
   * Notify about leave request action
   */
  async notifyLeaveRequest(
    leaveRequestId: string, 
    action: 'created' | 'approved' | 'rejected' | 'cancelled'
  ): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          lr.request_id,
          lr.employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          e.user_id as employee_user_id,
          e.manager_id,
          m.user_id as manager_user_id,
          m.first_name || ' ' || m.last_name as manager_name,
          lr.start_date,
          lr.end_date,
          lr.number_of_days,
          lt.leave_type_name,
          lr.status
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.employee_id
        LEFT JOIN employees m ON e.manager_id = m.employee_id
        JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
        WHERE lr.request_id = $1
      `, [leaveRequestId]);

      if (result.rows.length === 0) {
        logger.warn(`Leave request ${leaveRequestId} not found`);
        return;
      }

      const leave = result.rows[0];

      switch (action) {
        case 'created':
          if (leave.manager_user_id) {
            await this.notifyUser(leave.manager_user_id, {
              type: 'leave.request.created',
              title: 'New Leave Request',
              message: `${leave.employee_name} has requested ${leave.number_of_days} day(s) of ${leave.leave_type_name}`,
              data: { leave_request_id: leaveRequestId },
              priority: 'normal'
            });
          }
          break;

        case 'approved':
          if (leave.employee_user_id) {
            await this.notifyUser(leave.employee_user_id, {
              type: 'leave.request.approved',
              title: 'Leave Request Approved',
              message: `Your ${leave.leave_type_name} request has been approved`,
              data: { leave_request_id: leaveRequestId },
              priority: 'high'
            });
          }
          break;

        case 'rejected':
          if (leave.employee_user_id) {
            await this.notifyUser(leave.employee_user_id, {
              type: 'leave.request.rejected',
              title: 'Leave Request Rejected',
              message: `Your ${leave.leave_type_name} request has been rejected`,
              data: { leave_request_id: leaveRequestId },
              priority: 'high'
            });
          }
          break;

        case 'cancelled':
          if (leave.manager_user_id) {
            await this.notifyUser(leave.manager_user_id, {
              type: 'leave.request.cancelled',
              title: 'Leave Request Cancelled',
              message: `${leave.employee_name} has cancelled their ${leave.leave_type_name} request`,
              data: { leave_request_id: leaveRequestId },
              priority: 'normal'
            });
          }
          break;
      }
    } catch (error) {
      logger.error('Error sending leave request notification:', error);
    }
  }

  /**
   * Notify about attendance irregularity
   */
  async notifyAttendanceIssue(employeeId: string, issueType: string, details: any): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          e.user_id,
          e.first_name || ' ' || e.last_name as employee_name,
          m.user_id as manager_user_id
        FROM employees e
        LEFT JOIN employees m ON e.manager_id = m.employee_id
        WHERE e.employee_id = $1
      `, [employeeId]);

      if (result.rows.length === 0) {return;}

      const employee = result.rows[0];

      // Notify employee
      if (employee.user_id) {
        await this.notifyUser(employee.user_id, {
          type: 'attendance.issue',
          title: 'Attendance Issue',
          message: `You have an attendance ${issueType}`,
          data: details,
          priority: 'normal'
        });
      }

      // Notify manager
      if (employee.manager_user_id) {
        await this.notifyUser(employee.manager_user_id, {
          type: 'attendance.issue.manager',
          title: 'Team Member Attendance Issue',
          message: `${employee.employee_name} has an attendance ${issueType}`,
          data: { ...details, employee_id: employeeId },
          priority: 'normal'
        });
      }
    } catch (error) {
      logger.error('Error sending attendance notification:', error);
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 
          AND is_read = FALSE 
          AND is_deleted = FALSE
      `, [userId]);

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1 AND user_id = $2
      `, [notificationId, userId]);

      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = FALSE
      `, [userId]);

      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: NotificationRecord[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [notificationsResult, countResult] = await Promise.all([
        this.db.query(`
          SELECT * FROM notifications
          WHERE user_id = $1 AND is_deleted = FALSE
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]),
        this.db.query(`
          SELECT COUNT(*) as count
          FROM notifications
          WHERE user_id = $1 AND is_deleted = FALSE
        `, [userId])
      ]);

      return {
        notifications: notificationsResult.rows,
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE notifications
        SET is_deleted = TRUE
        WHERE notification_id = $1 AND user_id = $2
      `, [notificationId, userId]);

      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }
}

/**
 * Factory function to create notification service
 */
export function createNotificationService(io: SocketIOServer, db: Pool): NotificationService {
  return new NotificationService(io, db);
}
