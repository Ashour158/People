// =====================================================
// REAL-TIME NOTIFICATIONS - WEBSOCKET IMPLEMENTATION
// =====================================================

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

interface SocketUser {
  user_id: string;
  employee_id: string;
  organization_id: string;
  company_id?: string;
  email: string;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// =====================================================
// WEBSOCKET SERVER SETUP
// =====================================================

export function setupWebSocket(httpServer: HTTPServer, db: Pool) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as SocketUser;
      
      // Attach user info to socket
      socket.data.user = decoded;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`User connected: ${user.email} (${socket.id})`);

    // Join user-specific room
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

    // Handle client events
    socket.on('subscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.join(channel);
        console.log(`User ${user.email} subscribed to ${channel}`);
      });
    });

    socket.on('unsubscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.leave(channel);
        console.log(`User ${user.email} unsubscribed from ${channel}`);
      });
    });

    // Mark notification as read
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await db.query(`
          UPDATE notifications
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
          WHERE notification_id = $1 AND user_id = $2
        `, [notificationId, user.user_id]);

        socket.emit('notification:read:success', { notificationId });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('notification:read:error', { notificationId, error: 'Failed to mark as read' });
      }
    });

    // Get unread count
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
        console.error('Error getting notification count:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.email} (${socket.id})`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${user.email}:`, error);
    });
  });

  return io;
}

// =====================================================
// NOTIFICATION HELPER FUNCTIONS
// =====================================================

export class NotificationService {
  constructor(private io: SocketIOServer, private db: Pool) {}

  /**
   * Send notification to specific user
   */
  async notifyUser(userId: string, notification: NotificationPayload) {
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

      // Send via WebSocket
      this.io.to(`user:${userId}`).emit('notification', {
        ...result.rows[0],
        timestamp: new Date().toISOString()
      });

      return result.rows[0];
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async notifyUsers(userIds: string[], notification: NotificationPayload) {
    const promises = userIds.map(userId => this.notifyUser(userId, notification));
    return Promise.all(promises);
  }

  /**
   * Send notification to organization
   */
  async notifyOrganization(organizationId: string, notification: NotificationPayload) {
    try {
      // Get all users in organization
      const result = await this.db.query(`
        SELECT user_id FROM users WHERE organization_id = $1 AND is_active = TRUE
      `, [organizationId]);

      const userIds = result.rows.map(row => row.user_id);
      await this.notifyUsers(userIds, notification);

      // Also broadcast to organization room
      this.io.to(`org:${organizationId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error notifying organization:', error);
      throw error;
    }
  }

  /**
   * Send notification to company
   */
  async notifyCompany(companyId: string, notification: NotificationPayload) {
    try {
      // Get all users in company
      const result = await this.db.query(`
        SELECT user_id FROM users 
        WHERE company_id = $1 AND is_active = TRUE
      `, [companyId]);

      const userIds = result.rows.map(row => row.user_id);
      await this.notifyUsers(userIds, notification);

      // Also broadcast to company room
      this.io.to(`company:${companyId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error notifying company:', error);
      throw error;
    }
  }

  /**
   * Send notification to department
   */
  async notifyDepartment(departmentId: string, notification: NotificationPayload) {
    try {
      const result = await this.db.query(`
        SELECT u.user_id 
        FROM users u
        JOIN employees e ON u.employee_id = e.employee_id
        WHERE e.department_id = $1 AND u.is_active = TRUE
      `, [departmentId]);

      const userIds = result.rows.map(row => row.user_id);
      await this.notifyUsers(userIds, notification);
    } catch (error) {
      console.error('Error notifying department:', error);
      throw error;
    }
  }

  /**
   * Notify about leave request
   */
  async notifyLeaveRequest(leaveRequestId: string, action: 'created' | 'approved' | 'rejected') {
    try {
      const result = await this.db.query(`
        SELECT 
          lr.employee_id,
          e.user_id as employee_user_id,
          e.manager_id,
          m.user_id as manager_user_id,
          lr.start_date,
          lr.end_date,
          lr.number_of_days,
          lt.leave_type_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.employee_id
        LEFT JOIN employees m ON e.manager_id = m.employee_id
        JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
        WHERE lr.request_id = $1
      `, [leaveRequestId]);

      if (result.rows.length === 0) return;

      const leave = result.rows[0];

      if (action === 'created' && leave.manager_user_id) {
        // Notify manager
        await this.notifyUser(leave.manager_user_id, {
          type: 'leave.request.created',
          title: 'New Leave Request',
          message: `Leave request for ${leave.number_of_days} day(s) needs your approval`,
          data: { leave_request_id: leaveRequestId },
          priority: 'normal'
        });
      } else if (action === 'approved' && leave.employee_user_id) {
        // Notify employee
        await this.notifyUser(leave.employee_user_id, {
          type: 'leave.request.approved',
          title: 'Leave Request Approved',
          message: `Your ${leave.leave_type_name} request has been approved`,
          data: { leave_request_id: leaveRequestId },
          priority: 'normal'
        });
      } else if (action === 'rejected' && leave.employee_user_id) {
        // Notify employee
        await this.notifyUser(leave.employee_user_id, {
          type: 'leave.request.rejected',
          title: 'Leave Request Rejected',
          message: `Your ${leave.leave_type_name} request has been rejected`,
          data: { leave_request_id: leaveRequestId },
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('Error notifying leave request:', error);
    }
  }

  /**
   * Notify about attendance reminder
   */
  async notifyAttendanceReminder(employeeId: string) {
    try {
      const result = await this.db.query(`
        SELECT user_id FROM employees WHERE employee_id = $1
      `, [employeeId]);

      if (result.rows.length === 0) return;

      await this.notifyUser(result.rows[0].user_id, {
        type: 'attendance.reminder',
        title: 'Attendance Reminder',
        message: 'Don\'t forget to check in for today',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending attendance reminder:', error);
    }
  }

  /**
   * Notify about performance review
   */
  async notifyPerformanceReview(reviewId: string, action: 'assigned' | 'submitted' | 'completed') {
    try {
      const result = await this.db.query(`
        SELECT 
          pr.employee_id,
          e.user_id as employee_user_id,
          pr.reviewer_id,
          r.user_id as reviewer_user_id,
          pc.cycle_name
        FROM performance_reviews pr
        JOIN employees e ON pr.employee_id = e.employee_id
        LEFT JOIN employees r ON pr.reviewer_id = r.employee_id
        JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
        WHERE pr.review_id = $1
      `, [reviewId]);

      if (result.rows.length === 0) return;

      const review = result.rows[0];

      if (action === 'assigned' && review.reviewer_user_id) {
        await this.notifyUser(review.reviewer_user_id, {
          type: 'performance.review.assigned',
          title: 'Performance Review Assigned',
          message: `You have been assigned to review an employee for ${review.cycle_name}`,
          data: { review_id: reviewId },
          priority: 'normal'
        });
      } else if (action === 'submitted' && review.employee_user_id) {
        await this.notifyUser(review.employee_user_id, {
          type: 'performance.review.submitted',
          title: 'Performance Review Submitted',
          message: `Your performance review for ${review.cycle_name} has been submitted`,
          data: { review_id: reviewId },
          priority: 'normal'
        });
      }
    } catch (error) {
      console.error('Error notifying performance review:', error);
    }
  }

  /**
   * Notify about payroll processing
   */
  async notifyPayrollProcessed(payrollRunId: string) {
    try {
      const result = await this.db.query(`
        SELECT 
          pi.employee_id,
          e.user_id,
          pr.period_month,
          pr.period_year,
          pi.net_salary
        FROM payroll_items pi
        JOIN payroll_runs pr ON pi.payroll_run_id = pr.payroll_run_id
        JOIN employees e ON pi.employee_id = e.employee_id
        WHERE pr.payroll_run_id = $1 AND pi.status = 'processed'
      `, [payrollRunId]);

      for (const row of result.rows) {
        await this.notifyUser(row.user_id, {
          type: 'payroll.processed',
          title: 'Salary Processed',
          message: `Your salary for ${row.period_month}/${row.period_year} has been processed`,
          data: { payroll_run_id: payrollRunId },
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('Error notifying payroll:', error);
    }
  }

  /**
   * Notify about asset assignment
   */
  async notifyAssetAssignment(assignmentId: string) {
    try {
      const result = await this.db.query(`
        SELECT 
          aa.employee_id,
          e.user_id,
          a.asset_name,
          a.asset_type
        FROM asset_assignments aa
        JOIN employees e ON aa.employee_id = e.employee_id
        JOIN assets a ON aa.asset_id = a.asset_id
        WHERE aa.assignment_id = $1
      `, [assignmentId]);

      if (result.rows.length === 0) return;

      const assignment = result.rows[0];

      await this.notifyUser(assignment.user_id, {
        type: 'asset.assigned',
        title: 'Asset Assigned',
        message: `${assignment.asset_name} (${assignment.asset_type}) has been assigned to you`,
        data: { assignment_id: assignmentId },
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error notifying asset assignment:', error);
    }
  }

  /**
   * Broadcast system announcement
   */
  async broadcastAnnouncement(organizationId: string, announcement: {
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }) {
    await this.notifyOrganization(organizationId, {
      type: 'system.announcement',
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority || 'normal'
    });
  }
}

// =====================================================
// EXPORT SETUP FUNCTION
// =====================================================

export function createNotificationService(io: SocketIOServer, db: Pool): NotificationService {
  return new NotificationService(io, db);
}
