// =====================================================
// Event Handlers
// Handlers for domain events to decouple business logic
// =====================================================

import { 
  DomainEvent,
  EmployeeCreatedEvent,
  LeaveRequestedEvent,
  LeaveApprovedEvent,
  LeaveRejectedEvent,
  TimesheetSubmittedEvent,
  TimesheetApprovedEvent,
  AttendanceCheckedInEvent,
  AttendanceCheckedOutEvent
} from './events';
import { emailService } from '../services/email.service';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { differenceInMinutes } from 'date-fns';

// =====================================================
// EVENT HANDLER INTERFACE
// =====================================================

export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  eventType: string;
  eventName: string;
}

// =====================================================
// EMPLOYEE EVENT HANDLERS
// =====================================================

export class EmployeeCreatedHandler implements IEventHandler<EmployeeCreatedEvent> {
  eventType = 'employee';
  eventName = 'employee.created';

  async handle(event: EmployeeCreatedEvent): Promise<void> {
    logger.info(`[EmployeeCreatedHandler] Processing employee.created event: ${event.aggregateId}`);
    
    try {
      // 1. Send welcome email to employee
      await this.sendWelcomeEmail(event.payload);
      
      // 2. Create default employee permissions/roles
      await this.createDefaultPermissions(event.payload.employeeId, event.organizationId);
      
      // 3. Notify HR team
      await this.notifyHRTeam(event.payload, event.organizationId);
      
      logger.info(`[EmployeeCreatedHandler] Successfully processed employee.created event`);
    } catch (error) {
      logger.error(`[EmployeeCreatedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async sendWelcomeEmail(payload: EmployeeCreatedEvent['payload']): Promise<void> {
    try {
      logger.info(`[EmployeeCreatedHandler] Sending welcome email to ${payload.email}`);
      
      // Generate a temporary password (in production, this should be securely generated)
      const tempPassword = `Welcome${Math.random().toString(36).slice(-8)}!`;
      
      await emailService.sendWelcomeEmail({
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        temporaryPassword: tempPassword,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login'
      });
      
      logger.info(`[EmployeeCreatedHandler] Welcome email sent successfully`);
    } catch (error) {
      logger.error(`[EmployeeCreatedHandler] Failed to send welcome email:`, error);
      // Don't throw - this shouldn't fail the entire event
    }
  }

  private async createDefaultPermissions(employeeId: string, organizationId: string): Promise<void> {
    try {
      logger.info(`[EmployeeCreatedHandler] Creating default permissions for employee ${employeeId}`);
      
      // Get or create the default "Employee" role
      const roleResult = await query(
        `SELECT role_id FROM roles 
         WHERE role_name = 'Employee' AND organization_id = $1 
         LIMIT 1`,
        [organizationId]
      );
      
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].role_id;
        
        // Assign the default role to the employee
        await query(
          `INSERT INTO user_roles (user_id, role_id, organization_id, created_at)
           SELECT u.user_id, $1, $2, NOW()
           FROM users u
           WHERE u.employee_id = $3 AND u.organization_id = $2
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [roleId, organizationId, employeeId]
        );
        
        logger.info(`[EmployeeCreatedHandler] Default permissions created successfully`);
      } else {
        logger.warn(`[EmployeeCreatedHandler] Default Employee role not found for organization ${organizationId}`);
      }
    } catch (error) {
      logger.error(`[EmployeeCreatedHandler] Failed to create default permissions:`, error);
      // Don't throw - this shouldn't fail the entire event
    }
  }

  private async notifyHRTeam(payload: EmployeeCreatedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[EmployeeCreatedHandler] Notifying HR team about new employee ${payload.firstName} ${payload.lastName}`);
      
      // Get HR team members (users with HR role)
      const hrUsersResult = await query(
        `SELECT DISTINCT u.user_id, u.email, e.first_name, e.last_name
         FROM users u
         JOIN employees e ON u.employee_id = e.employee_id
         JOIN user_roles ur ON u.user_id = ur.user_id
         JOIN roles r ON ur.role_id = r.role_id
         WHERE u.organization_id = $1 
           AND r.role_name IN ('HR Admin', 'HR Manager', 'Admin')
           AND u.is_active = TRUE
           AND u.is_deleted = FALSE`,
        [organizationId]
      );
      
      // Send notification to each HR team member
      for (const hrUser of hrUsersResult.rows) {
        await emailService.sendEmail({
          to: hrUser.email,
          subject: 'New Employee Onboarded',
          html: `
            <h2>New Employee Onboarded</h2>
            <p>A new employee has been added to the system:</p>
            <ul>
              <li><strong>Name:</strong> ${payload.firstName} ${payload.lastName}</li>
              <li><strong>Email:</strong> ${payload.email}</li>
              <li><strong>Department:</strong> ${payload.departmentName || 'Not assigned'}</li>
              <li><strong>Designation:</strong> ${payload.designation || 'Not specified'}</li>
            </ul>
            <p>Please ensure all onboarding tasks are completed.</p>
          `
        });
      }
      
      logger.info(`[EmployeeCreatedHandler] HR team notified successfully (${hrUsersResult.rows.length} members)`);
    } catch (error) {
      logger.error(`[EmployeeCreatedHandler] Failed to notify HR team:`, error);
      // Don't throw - this shouldn't fail the entire event
    }
  }
}

// =====================================================
// LEAVE EVENT HANDLERS
// =====================================================

export class LeaveRequestedHandler implements IEventHandler<LeaveRequestedEvent> {
  eventType = 'leave';
  eventName = 'leave.requested';

  async handle(event: LeaveRequestedEvent): Promise<void> {
    logger.info(`[LeaveRequestedHandler] Processing leave.requested event: ${event.aggregateId}`);
    
    try {
      // 1. Notify approvers (reporting manager, HR)
      await this.notifyApprovers(event.payload, event.organizationId);
      
      // 2. Check for leave conflicts
      await this.checkLeaveConflicts(event.payload, event.organizationId);
      
      // 3. Send acknowledgment email to employee
      await this.sendAcknowledgmentEmail(event.payload, event.organizationId);
      
      logger.info(`[LeaveRequestedHandler] Successfully processed leave.requested event`);
    } catch (error) {
      logger.error(`[LeaveRequestedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async notifyApprovers(payload: LeaveRequestedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveRequestedHandler] Notifying approvers for leave request ${payload.leaveRequestId}`);
      
      // Get employee details including manager
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, e.email, e.manager_id,
                m.first_name as manager_first_name, m.last_name as manager_last_name,
                u_manager.email as manager_email
         FROM employees e
         LEFT JOIN employees m ON e.manager_id = m.employee_id
         LEFT JOIN users u_manager ON m.employee_id = u_manager.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) {
        logger.warn(`[LeaveRequestedHandler] Employee not found: ${payload.employeeId}`);
        return;
      }
      
      const employee = employeeResult.rows[0];
      
      // Get leave type details
      const leaveTypeResult = await query(
        `SELECT leave_type_name FROM leave_types WHERE leave_type_id = $1`,
        [payload.leaveTypeId]
      );
      const leaveTypeName = leaveTypeResult.rows[0]?.leave_type_name || 'Unknown';
      
      const emailData = {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        leaveType: leaveTypeName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        numberOfDays: payload.numberOfDays,
        status: 'pending',
        reason: payload.reason
      };
      
      // Notify reporting manager
      if (employee.manager_email) {
        await emailService.sendLeaveNotification(employee.manager_email, emailData);
        logger.info(`[LeaveRequestedHandler] Manager notified: ${employee.manager_email}`);
      }
      
      // Notify HR team
      const hrUsersResult = await query(
        `SELECT DISTINCT u.email
         FROM users u
         JOIN user_roles ur ON u.user_id = ur.user_id
         JOIN roles r ON ur.role_id = r.role_id
         WHERE u.organization_id = $1 
           AND r.role_name IN ('HR Admin', 'HR Manager')
           AND u.is_active = TRUE`,
        [organizationId]
      );
      
      for (const hrUser of hrUsersResult.rows) {
        await emailService.sendLeaveNotification(hrUser.email, emailData);
      }
      
      logger.info(`[LeaveRequestedHandler] Approvers notified successfully`);
    } catch (error) {
      logger.error(`[LeaveRequestedHandler] Failed to notify approvers:`, error);
    }
  }

  private async checkLeaveConflicts(payload: LeaveRequestedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveRequestedHandler] Checking for conflicts for leave request ${payload.leaveRequestId}`);
      
      // Check if multiple team members are on leave during same period
      const employeeResult = await query(
        `SELECT department_id, manager_id FROM employees 
         WHERE employee_id = $1 AND organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) {
        return;
      }
      
      const { department_id, manager_id } = employeeResult.rows[0];
      
      // Find overlapping leave requests in the same team
      const conflictResult = await query(
        `SELECT COUNT(*) as conflict_count,
                array_agg(e.first_name || ' ' || e.last_name) as employee_names
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.employee_id
         WHERE lr.organization_id = $1
           AND lr.leave_request_id != $2
           AND lr.status = 'approved'
           AND (e.department_id = $3 OR e.manager_id = $4)
           AND (
             (lr.from_date BETWEEN $5 AND $6) OR
             (lr.to_date BETWEEN $5 AND $6) OR
             (lr.from_date <= $5 AND lr.to_date >= $6)
           )`,
        [organizationId, payload.leaveRequestId, department_id, manager_id, payload.startDate, payload.endDate]
      );
      
      const conflictCount = parseInt(conflictResult.rows[0]?.conflict_count || '0');
      
      if (conflictCount > 0) {
        logger.warn(
          `[LeaveRequestedHandler] Leave conflict detected! ${conflictCount} team member(s) already on leave during this period: ${conflictResult.rows[0].employee_names}`
        );
        
        // Optionally notify the manager about the conflict
        const managerResult = await query(
          `SELECT u.email FROM users u 
           WHERE u.employee_id = $1 AND u.organization_id = $2`,
          [manager_id, organizationId]
        );
        
        if (managerResult.rows.length > 0) {
          await emailService.sendEmail({
            to: managerResult.rows[0].email,
            subject: 'Leave Conflict Warning',
            html: `
              <h2>Leave Request Conflict Detected</h2>
              <p>A new leave request has a potential scheduling conflict.</p>
              <p><strong>Note:</strong> ${conflictCount} team member(s) are already approved for leave during this period.</p>
              <p>Conflicting employees: ${conflictResult.rows[0].employee_names.join(', ')}</p>
              <p>Please review the leave request carefully.</p>
            `
          });
        }
      } else {
        logger.info(`[LeaveRequestedHandler] No leave conflicts detected`);
      }
    } catch (error) {
      logger.error(`[LeaveRequestedHandler] Failed to check conflicts:`, error);
    }
  }

  private async sendAcknowledgmentEmail(payload: LeaveRequestedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveRequestedHandler] Sending acknowledgment email for leave request ${payload.leaveRequestId}`);
      
      // Get employee email
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, u.email
         FROM employees e
         JOIN users u ON e.employee_id = u.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) {
        logger.warn(`[LeaveRequestedHandler] Employee not found for acknowledgment`);
        return;
      }
      
      const employee = employeeResult.rows[0];
      
      // Get leave type name
      const leaveTypeResult = await query(
        `SELECT leave_type_name FROM leave_types WHERE leave_type_id = $1`,
        [payload.leaveTypeId]
      );
      
      await emailService.sendLeaveNotification(employee.email, {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        leaveType: leaveTypeResult.rows[0]?.leave_type_name || 'Leave',
        startDate: payload.startDate,
        endDate: payload.endDate,
        numberOfDays: payload.numberOfDays,
        status: 'pending',
        reason: payload.reason
      });
      
      logger.info(`[LeaveRequestedHandler] Acknowledgment email sent successfully`);
    } catch (error) {
      logger.error(`[LeaveRequestedHandler] Failed to send acknowledgment:`, error);
    }
  }
}

export class LeaveApprovedHandler implements IEventHandler<LeaveApprovedEvent> {
  eventType = 'leave';
  eventName = 'leave.approved';

  async handle(event: LeaveApprovedEvent): Promise<void> {
    logger.info(`[LeaveApprovedHandler] Processing leave.approved event: ${event.aggregateId}`);
    
    try {
      // 1. Update leave balance
      await this.updateLeaveBalance(event.payload, event.organizationId);
      
      // 2. Notify employee
      await this.notifyEmployee(event.payload, event.organizationId);
      
      // 3. Update team calendar and notify team
      await this.updateTeamCalendar(event.payload, event.organizationId);
      await this.notifyTeam(event.payload, event.organizationId);
      
      logger.info(`[LeaveApprovedHandler] Successfully processed leave.approved event`);
    } catch (error) {
      logger.error(`[LeaveApprovedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async updateLeaveBalance(payload: LeaveApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveApprovedHandler] Updating leave balance for employee ${payload.employeeId}`);
      
      // Get current year for leave balance
      const currentYear = new Date().getFullYear();
      
      // Deduct approved days from leave balance
      await query(
        `UPDATE leave_balances
         SET used_days = used_days + $1,
             available_days = available_days - $1,
             updated_at = NOW()
         WHERE employee_id = $2 
           AND organization_id = $3
           AND leave_type_id = $4
           AND year = $5`,
        [payload.numberOfDays, payload.employeeId, organizationId, payload.leaveTypeId, currentYear]
      );
      
      logger.info(`[LeaveApprovedHandler] Leave balance updated: ${payload.numberOfDays} days deducted`);
    } catch (error) {
      logger.error(`[LeaveApprovedHandler] Failed to update leave balance:`, error);
    }
  }

  private async notifyEmployee(payload: LeaveApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveApprovedHandler] Notifying employee ${payload.employeeId} about leave approval`);
      
      // Get employee details
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, u.email
         FROM employees e
         JOIN users u ON e.employee_id = u.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) return;
      
      const employee = employeeResult.rows[0];
      
      // Get leave type
      const leaveTypeResult = await query(
        `SELECT leave_type_name FROM leave_types WHERE leave_type_id = $1`,
        [payload.leaveTypeId]
      );
      
      // Send approval notification
      await emailService.sendLeaveNotification(employee.email, {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        leaveType: leaveTypeResult.rows[0]?.leave_type_name || 'Leave',
        startDate: payload.startDate,
        endDate: payload.endDate,
        numberOfDays: payload.numberOfDays,
        status: 'approved',
        reason: payload.approverComments
      });
      
      logger.info(`[LeaveApprovedHandler] Employee notified successfully`);
    } catch (error) {
      logger.error(`[LeaveApprovedHandler] Failed to notify employee:`, error);
    }
  }

  private async updateTeamCalendar(payload: LeaveApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveApprovedHandler] Updating team calendar for leave ${payload.leaveRequestId}`);
      
      // Insert into team calendar or update existing entry
      await query(
        `INSERT INTO team_calendar (
           organization_id, employee_id, event_type, event_title,
           start_date, end_date, is_all_day, created_at, updated_at
         ) VALUES ($1, $2, 'leave', $3, $4, $5, TRUE, NOW(), NOW())
         ON CONFLICT (organization_id, employee_id, start_date, event_type) 
         DO UPDATE SET 
           event_title = EXCLUDED.event_title,
           end_date = EXCLUDED.end_date,
           updated_at = NOW()`,
        [
          organizationId,
          payload.employeeId,
          `Leave - ${payload.leaveTypeName || 'Approved'}`,
          payload.startDate,
          payload.endDate
        ]
      );
      
      logger.info(`[LeaveApprovedHandler] Team calendar updated successfully`);
    } catch (error) {
      logger.error(`[LeaveApprovedHandler] Failed to update team calendar:`, error);
    }
  }

  private async notifyTeam(payload: LeaveApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveApprovedHandler] Notifying team about employee absence`);
      
      // Get employee details and team members
      const teamResult = await query(
        `SELECT 
           e1.first_name, e1.last_name, e1.department_id,
           e2.first_name as team_first_name, e2.last_name as team_last_name,
           u2.email as team_email
         FROM employees e1
         JOIN employees e2 ON e1.department_id = e2.department_id
         JOIN users u2 ON e2.employee_id = u2.employee_id
         WHERE e1.employee_id = $1 
           AND e1.organization_id = $2
           AND e2.employee_id != $1
           AND e2.employee_status = 'active'
           AND u2.is_active = TRUE`,
        [payload.employeeId, organizationId]
      );
      
      if (teamResult.rows.length === 0) {
        logger.info(`[LeaveApprovedHandler] No team members to notify`);
        return;
      }
      
      const employeeName = `${teamResult.rows[0].first_name} ${teamResult.rows[0].last_name}`;
      
      // Notify each team member
      for (const teamMember of teamResult.rows) {
        await emailService.sendEmail({
          to: teamMember.team_email,
          subject: `Team Member on Leave: ${employeeName}`,
          html: `
            <h2>Team Member Leave Notification</h2>
            <p><strong>${employeeName}</strong> will be on leave:</p>
            <ul>
              <li><strong>Leave Type:</strong> ${payload.leaveTypeName || 'Leave'}</li>
              <li><strong>From:</strong> ${payload.startDate}</li>
              <li><strong>To:</strong> ${payload.endDate}</li>
              <li><strong>Duration:</strong> ${payload.numberOfDays} day(s)</li>
            </ul>
            <p>Please plan your work accordingly.</p>
          `
        });
      }
      
      logger.info(`[LeaveApprovedHandler] Team members notified (${teamResult.rows.length} members)`);
    } catch (error) {
      logger.error(`[LeaveApprovedHandler] Failed to notify team:`, error);
    }
  }
}

export class LeaveRejectedHandler implements IEventHandler<LeaveRejectedEvent> {
  eventType = 'leave';
  eventName = 'leave.rejected';

  async handle(event: LeaveRejectedEvent): Promise<void> {
    logger.info(`[LeaveRejectedHandler] Processing leave.rejected event: ${event.aggregateId}`);
    
    try {
      // 1. Notify employee with rejection reason
      await this.notifyEmployee(event.payload, event.organizationId);
      
      // 2. Update leave balance (restore pending days if any were reserved)
      await this.restorePendingBalance(event.payload, event.organizationId);
      
      logger.info(`[LeaveRejectedHandler] Successfully processed leave.rejected event`);
    } catch (error) {
      logger.error(`[LeaveRejectedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async notifyEmployee(payload: LeaveRejectedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveRejectedHandler] Notifying employee ${payload.employeeId} about leave rejection`);
      
      // Get employee details
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, u.email
         FROM employees e
         JOIN users u ON e.employee_id = u.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) {
        logger.warn(`[LeaveRejectedHandler] Employee not found`);
        return;
      }
      
      const employee = employeeResult.rows[0];
      
      // Get leave type
      const leaveTypeResult = await query(
        `SELECT leave_type_name FROM leave_types WHERE leave_type_id = $1`,
        [payload.leaveTypeId]
      );
      
      // Send rejection notification with reason
      await emailService.sendEmail({
        to: employee.email,
        subject: 'Leave Request Rejected',
        html: `
          <h2>Leave Request Rejected</h2>
          <p>Dear ${employee.first_name} ${employee.last_name},</p>
          <p>Your leave request has been <strong style="color: #f44336;">rejected</strong>.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3>Leave Details:</h3>
            <ul>
              <li><strong>Leave Type:</strong> ${leaveTypeResult.rows[0]?.leave_type_name || 'Leave'}</li>
              <li><strong>From:</strong> ${payload.startDate}</li>
              <li><strong>To:</strong> ${payload.endDate}</li>
              <li><strong>Duration:</strong> ${payload.numberOfDays} day(s)</li>
            </ul>
          </div>
          
          ${payload.rejectionReason ? `
          <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
            <h3>Reason for Rejection:</h3>
            <p>${payload.rejectionReason}</p>
          </div>
          ` : ''}
          
          <p>If you have any questions, please contact your manager or HR department.</p>
        `
      });
      
      logger.info(`[LeaveRejectedHandler] Rejection notification sent successfully`);
    } catch (error) {
      logger.error(`[LeaveRejectedHandler] Failed to notify employee:`, error);
    }
  }

  private async restorePendingBalance(payload: LeaveRejectedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[LeaveRejectedHandler] Restoring pending balance for employee ${payload.employeeId}`);
      
      const currentYear = new Date().getFullYear();
      
      // Restore pending days back to available balance
      // (In case the system had reserved days when the request was pending)
      await query(
        `UPDATE leave_balances
         SET pending_days = GREATEST(pending_days - $1, 0),
             available_days = available_days + LEAST(pending_days, $1),
             updated_at = NOW()
         WHERE employee_id = $2 
           AND organization_id = $3
           AND leave_type_id = $4
           AND year = $5
           AND pending_days > 0`,
        [payload.numberOfDays, payload.employeeId, organizationId, payload.leaveTypeId, currentYear]
      );
      
      logger.info(`[LeaveRejectedHandler] Pending balance restored successfully`);
    } catch (error) {
      logger.error(`[LeaveRejectedHandler] Failed to restore pending balance:`, error);
    }
  }
}

// =====================================================
// TIMESHEET EVENT HANDLERS
// =====================================================

export class TimesheetSubmittedHandler implements IEventHandler<TimesheetSubmittedEvent> {
  eventType = 'timesheet';
  eventName = 'timesheet.submitted';

  async handle(event: TimesheetSubmittedEvent): Promise<void> {
    logger.info(`[TimesheetSubmittedHandler] Processing timesheet.submitted event: ${event.aggregateId}`);
    
    try {
      // 1. Notify approvers (manager, project leads)
      await this.notifyApprovers(event.payload, event.organizationId);
      
      // 2. Validate timesheet data
      await this.validateTimesheet(event.payload, event.organizationId);
      
      // 3. Send acknowledgment to employee
      await this.sendAcknowledgment(event.payload, event.organizationId);
      
      logger.info(`[TimesheetSubmittedHandler] Successfully processed timesheet.submitted event`);
    } catch (error) {
      logger.error(`[TimesheetSubmittedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async notifyApprovers(payload: TimesheetSubmittedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetSubmittedHandler] Notifying approvers for timesheet ${payload.timesheetId}`);
      
      // Get employee and manager details
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, e.email, e.manager_id,
                m.first_name as manager_first_name, m.last_name as manager_last_name,
                u_manager.email as manager_email
         FROM employees e
         LEFT JOIN employees m ON e.manager_id = m.employee_id
         LEFT JOIN users u_manager ON m.employee_id = u_manager.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) return;
      
      const employee = employeeResult.rows[0];
      
      // Notify manager if exists
      if (employee.manager_email) {
        await emailService.sendEmail({
          to: employee.manager_email,
          subject: 'New Timesheet Submission',
          html: `
            <h2>New Timesheet Submitted for Approval</h2>
            <p><strong>${employee.first_name} ${employee.last_name}</strong> has submitted a timesheet for your approval.</p>
            <ul>
              <li><strong>Period:</strong> ${payload.periodStart} to ${payload.periodEnd}</li>
              <li><strong>Total Hours:</strong> ${payload.totalHours}</li>
              ${payload.overtimeHours ? `<li><strong>Overtime Hours:</strong> ${payload.overtimeHours}</li>` : ''}
            </ul>
            <p>Please review and approve the timesheet at your earliest convenience.</p>
          `
        });
        
        logger.info(`[TimesheetSubmittedHandler] Manager notified: ${employee.manager_email}`);
      }
      
      // Notify HR team
      const hrUsersResult = await query(
        `SELECT DISTINCT u.email
         FROM users u
         JOIN user_roles ur ON u.user_id = ur.user_id
         JOIN roles r ON ur.role_id = r.role_id
         WHERE u.organization_id = $1 
           AND r.role_name IN ('HR Admin', 'Payroll Manager')
           AND u.is_active = TRUE`,
        [organizationId]
      );
      
      for (const hrUser of hrUsersResult.rows) {
        await emailService.sendEmail({
          to: hrUser.email,
          subject: 'Timesheet Submitted',
          html: `
            <p>A new timesheet has been submitted by ${employee.first_name} ${employee.last_name}.</p>
            <p>Period: ${payload.periodStart} to ${payload.periodEnd}, Total Hours: ${payload.totalHours}</p>
          `
        });
      }
      
      logger.info(`[TimesheetSubmittedHandler] Approvers notified successfully`);
    } catch (error) {
      logger.error(`[TimesheetSubmittedHandler] Failed to notify approvers:`, error);
    }
  }

  private async validateTimesheet(payload: TimesheetSubmittedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetSubmittedHandler] Validating timesheet ${payload.timesheetId}`);
      
      // Check if total hours exceed reasonable limits
      if (payload.totalHours > 168) { // More than hours in a week
        logger.warn(`[TimesheetSubmittedHandler] Timesheet has excessive hours: ${payload.totalHours}`);
      }
      
      // Check for overtime hours
      if (payload.overtimeHours && payload.overtimeHours > 0) {
        logger.info(`[TimesheetSubmittedHandler] Overtime detected: ${payload.overtimeHours} hours`);
        
        // Log overtime for payroll processing
        await query(
          `INSERT INTO overtime_records (
             employee_id, organization_id, timesheet_id, 
             overtime_hours, period_start, period_end, 
             status, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
           ON CONFLICT (timesheet_id) DO UPDATE SET
             overtime_hours = EXCLUDED.overtime_hours,
             updated_at = NOW()`,
          [
            payload.employeeId,
            organizationId,
            payload.timesheetId,
            payload.overtimeHours,
            payload.periodStart,
            payload.periodEnd
          ]
        );
      }
      
      logger.info(`[TimesheetSubmittedHandler] Timesheet validation completed`);
    } catch (error) {
      logger.error(`[TimesheetSubmittedHandler] Failed to validate timesheet:`, error);
    }
  }

  private async sendAcknowledgment(payload: TimesheetSubmittedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetSubmittedHandler] Sending acknowledgment for timesheet ${payload.timesheetId}`);
      
      // Get employee email
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, u.email
         FROM employees e
         JOIN users u ON e.employee_id = u.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) return;
      
      const employee = employeeResult.rows[0];
      
      await emailService.sendEmail({
        to: employee.email,
        subject: 'Timesheet Submission Confirmed',
        html: `
          <h2>Timesheet Submission Confirmed</h2>
          <p>Dear ${employee.first_name} ${employee.last_name},</p>
          <p>Your timesheet has been successfully submitted and is now pending approval.</p>
          <ul>
            <li><strong>Period:</strong> ${payload.periodStart} to ${payload.periodEnd}</li>
            <li><strong>Total Hours:</strong> ${payload.totalHours}</li>
            ${payload.overtimeHours ? `<li><strong>Overtime Hours:</strong> ${payload.overtimeHours}</li>` : ''}
          </ul>
          <p>You will be notified once your timesheet is reviewed.</p>
        `
      });
      
      logger.info(`[TimesheetSubmittedHandler] Acknowledgment sent successfully`);
    } catch (error) {
      logger.error(`[TimesheetSubmittedHandler] Failed to send acknowledgment:`, error);
    }
  }
}

export class TimesheetApprovedHandler implements IEventHandler<TimesheetApprovedEvent> {
  eventType = 'timesheet';
  eventName = 'timesheet.approved';

  async handle(event: TimesheetApprovedEvent): Promise<void> {
    logger.info(`[TimesheetApprovedHandler] Processing timesheet.approved event: ${event.aggregateId}`);
    
    try {
      // 1. Update project cost allocation
      await this.updateCostAllocation(event.payload, event.organizationId);
      
      // 2. Trigger payroll calculation
      await this.triggerPayrollCalculation(event.payload, event.organizationId);
      
      // 3. Notify employee
      await this.notifyEmployee(event.payload, event.organizationId);
      
      // 4. Sync with finance/accounting systems
      await this.syncWithFinance(event.payload, event.organizationId);
      
      logger.info(`[TimesheetApprovedHandler] Successfully processed timesheet.approved event`);
    } catch (error) {
      logger.error(`[TimesheetApprovedHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async updateCostAllocation(payload: TimesheetApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetApprovedHandler] Updating cost allocation for timesheet ${payload.timesheetId}`);
      
      // Get employee hourly rate
      const employeeResult = await query(
        `SELECT hourly_rate, department_id FROM employees 
         WHERE employee_id = $1 AND organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) {
        logger.warn(`[TimesheetApprovedHandler] Employee not found for cost allocation`);
        return;
      }
      
      const { hourly_rate, department_id } = employeeResult.rows[0];
      const hourlyRate = parseFloat(hourly_rate || '0');
      
      if (hourlyRate > 0) {
        const totalCost = payload.totalHours * hourlyRate;
        const overtimeCost = (payload.overtimeHours || 0) * hourlyRate * 1.5; // 1.5x for overtime
        
        // Record cost allocation
        await query(
          `INSERT INTO cost_allocations (
             organization_id, employee_id, timesheet_id, department_id,
             regular_hours, overtime_hours, regular_cost, overtime_cost, 
             total_cost, period_start, period_end, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (timesheet_id) DO UPDATE SET
             regular_hours = EXCLUDED.regular_hours,
             overtime_hours = EXCLUDED.overtime_hours,
             regular_cost = EXCLUDED.regular_cost,
             overtime_cost = EXCLUDED.overtime_cost,
             total_cost = EXCLUDED.total_cost,
             updated_at = NOW()`,
          [
            organizationId,
            payload.employeeId,
            payload.timesheetId,
            department_id,
            payload.totalHours,
            payload.overtimeHours || 0,
            totalCost,
            overtimeCost,
            totalCost + overtimeCost,
            payload.periodStart,
            payload.periodEnd
          ]
        );
        
        logger.info(`[TimesheetApprovedHandler] Cost allocation updated: $${(totalCost + overtimeCost).toFixed(2)}`);
      }
    } catch (error) {
      logger.error(`[TimesheetApprovedHandler] Failed to update cost allocation:`, error);
    }
  }

  private async triggerPayrollCalculation(payload: TimesheetApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetApprovedHandler] Triggering payroll calculation for employee ${payload.employeeId}`);
      
      // Update or create payroll entry for the period
      await query(
        `INSERT INTO payroll_entries (
           organization_id, employee_id, timesheet_id,
           regular_hours, overtime_hours, period_start, period_end,
           status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
         ON CONFLICT (employee_id, period_start, period_end) 
         DO UPDATE SET
           regular_hours = payroll_entries.regular_hours + EXCLUDED.regular_hours,
           overtime_hours = payroll_entries.overtime_hours + EXCLUDED.overtime_hours,
           timesheet_id = EXCLUDED.timesheet_id,
           updated_at = NOW()`,
        [
          organizationId,
          payload.employeeId,
          payload.timesheetId,
          payload.totalHours,
          payload.overtimeHours || 0,
          payload.periodStart,
          payload.periodEnd
        ]
      );
      
      logger.info(`[TimesheetApprovedHandler] Payroll calculation triggered`);
    } catch (error) {
      logger.error(`[TimesheetApprovedHandler] Failed to trigger payroll calculation:`, error);
    }
  }

  private async notifyEmployee(payload: TimesheetApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetApprovedHandler] Notifying employee ${payload.employeeId} about timesheet approval`);
      
      // Get employee details
      const employeeResult = await query(
        `SELECT e.first_name, e.last_name, u.email
         FROM employees e
         JOIN users u ON e.employee_id = u.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (employeeResult.rows.length === 0) return;
      
      const employee = employeeResult.rows[0];
      
      await emailService.sendEmail({
        to: employee.email,
        subject: 'Timesheet Approved',
        html: `
          <h2>Timesheet Approved</h2>
          <p>Dear ${employee.first_name} ${employee.last_name},</p>
          <p>Your timesheet has been <strong style="color: #4caf50;">approved</strong>!</p>
          <ul>
            <li><strong>Period:</strong> ${payload.periodStart} to ${payload.periodEnd}</li>
            <li><strong>Total Hours:</strong> ${payload.totalHours}</li>
            ${payload.overtimeHours ? `<li><strong>Overtime Hours:</strong> ${payload.overtimeHours}</li>` : ''}
            ${payload.approverComments ? `<li><strong>Comments:</strong> ${payload.approverComments}</li>` : ''}
          </ul>
          <p>These hours will be included in your next payroll cycle.</p>
        `
      });
      
      logger.info(`[TimesheetApprovedHandler] Employee notified successfully`);
    } catch (error) {
      logger.error(`[TimesheetApprovedHandler] Failed to notify employee:`, error);
    }
  }

  private async syncWithFinance(payload: TimesheetApprovedEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[TimesheetApprovedHandler] Syncing timesheet with finance system`);
      
      // Create finance transaction record for approved timesheet
      await query(
        `INSERT INTO finance_transactions (
           organization_id, transaction_type, reference_type, reference_id,
           employee_id, amount, description, transaction_date, status, created_at
         ) 
         SELECT 
           $1, 'labor_cost', 'timesheet', $2, $3,
           (e.hourly_rate * $4) + (e.hourly_rate * $5 * 1.5),
           $6, CURRENT_DATE, 'pending', NOW()
         FROM employees e
         WHERE e.employee_id = $3 AND e.organization_id = $1
         ON CONFLICT (reference_type, reference_id) DO NOTHING`,
        [
          organizationId,
          payload.timesheetId,
          payload.employeeId,
          payload.totalHours,
          payload.overtimeHours || 0,
          `Timesheet approval - Period: ${payload.periodStart} to ${payload.periodEnd}`
        ]
      );
      
      logger.info(`[TimesheetApprovedHandler] Finance sync completed`);
    } catch (error) {
      logger.error(`[TimesheetApprovedHandler] Failed to sync with finance:`, error);
    }
  }
}

// =====================================================
// ATTENDANCE EVENT HANDLERS
// =====================================================

export class AttendanceCheckedInHandler implements IEventHandler<AttendanceCheckedInEvent> {
  eventType = 'attendance';
  eventName = 'attendance.checked_in';

  async handle(event: AttendanceCheckedInEvent): Promise<void> {
    logger.info(`[AttendanceCheckedInHandler] Processing attendance.checked_in event: ${event.aggregateId}`);
    
    try {
      // 1. Check for late arrival
      await this.checkLateArrival(event.payload, event.organizationId);
      
      // 2. Update team presence dashboard
      await this.updatePresenceDashboard(event.payload, event.organizationId);
      
      logger.info(`[AttendanceCheckedInHandler] Successfully processed attendance.checked_in event`);
    } catch (error) {
      logger.error(`[AttendanceCheckedInHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async checkLateArrival(payload: AttendanceCheckedInEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[AttendanceCheckedInHandler] Checking late arrival for employee ${payload.employeeId}`);
      
      // Get employee shift information
      const shiftResult = await query(
        `SELECT 
           ws.shift_name, ws.start_time, ws.grace_period_minutes,
           e.first_name, e.last_name, e.manager_id,
           u.email as employee_email,
           u_manager.email as manager_email
         FROM employees e
         LEFT JOIN shift_assignments sa ON e.employee_id = sa.employee_id 
           AND sa.is_active = TRUE
           AND CURRENT_DATE BETWEEN sa.effective_from AND COALESCE(sa.effective_to, CURRENT_DATE)
         LEFT JOIN work_shifts ws ON sa.shift_id = ws.shift_id
         LEFT JOIN users u ON e.employee_id = u.employee_id
         LEFT JOIN users u_manager ON e.manager_id = u_manager.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (shiftResult.rows.length === 0 || !shiftResult.rows[0].start_time) {
        logger.info(`[AttendanceCheckedInHandler] No shift assigned or start time not defined`);
        return;
      }
      
      const shift = shiftResult.rows[0];
      const checkInTime = new Date(payload.checkInTime);
      
      // Parse shift start time (format: "HH:MM:SS")
      const [hours, minutes] = shift.start_time.split(':').map(Number);
      const shiftStartTime = new Date(checkInTime);
      shiftStartTime.setHours(hours, minutes, 0, 0);
      
      // Add grace period
      const graceMinutes = shift.grace_period_minutes || 0;
      const allowedTime = new Date(shiftStartTime.getTime() + graceMinutes * 60000);
      
      // Check if late
      if (checkInTime > allowedTime) {
        const lateMinutes = differenceInMinutes(checkInTime, allowedTime);
        
        logger.warn(`[AttendanceCheckedInHandler] Employee ${shift.first_name} ${shift.last_name} is late by ${lateMinutes} minutes`);
        
        // Record late arrival
        await query(
          `INSERT INTO attendance_violations (
             organization_id, employee_id, attendance_id, violation_type,
             violation_date, late_by_minutes, description, status, created_at
           ) VALUES ($1, $2, $3, 'late_arrival', $4, $5, $6, 'pending', NOW())
           ON CONFLICT (attendance_id, violation_type) DO NOTHING`,
          [
            organizationId,
            payload.employeeId,
            payload.attendanceId,
            payload.checkInTime,
            lateMinutes,
            `Late by ${lateMinutes} minutes. Shift start: ${shift.start_time}, Grace period: ${graceMinutes} minutes`
          ]
        );
        
        // Notify manager if significantly late (> 15 minutes)
        if (lateMinutes > 15 && shift.manager_email) {
          await emailService.sendEmail({
            to: shift.manager_email,
            subject: 'Late Arrival Notification',
            html: `
              <h2>Late Arrival Notification</h2>
              <p><strong>${shift.first_name} ${shift.last_name}</strong> checked in late today.</p>
              <ul>
                <li><strong>Shift Start Time:</strong> ${shift.start_time}</li>
                <li><strong>Check-in Time:</strong> ${checkInTime.toLocaleTimeString()}</li>
                <li><strong>Late by:</strong> ${lateMinutes} minutes</li>
              </ul>
            `
          });
        }
      } else {
        logger.info(`[AttendanceCheckedInHandler] Employee checked in on time`);
      }
    } catch (error) {
      logger.error(`[AttendanceCheckedInHandler] Failed to check late arrival:`, error);
    }
  }

  private async updatePresenceDashboard(payload: AttendanceCheckedInEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[AttendanceCheckedInHandler] Updating presence dashboard`);
      
      // Update real-time presence tracking
      await query(
        `INSERT INTO employee_presence (
           organization_id, employee_id, presence_date, 
           status, check_in_time, last_updated
         ) VALUES ($1, $2, CURRENT_DATE, 'present', $3, NOW())
         ON CONFLICT (organization_id, employee_id, presence_date)
         DO UPDATE SET
           status = 'present',
           check_in_time = EXCLUDED.check_in_time,
           last_updated = NOW()`,
        [organizationId, payload.employeeId, payload.checkInTime]
      );
      
      logger.info(`[AttendanceCheckedInHandler] Presence dashboard updated`);
    } catch (error) {
      logger.error(`[AttendanceCheckedInHandler] Failed to update presence dashboard:`, error);
    }
  }
}

export class AttendanceCheckedOutHandler implements IEventHandler<AttendanceCheckedOutEvent> {
  eventType = 'attendance';
  eventName = 'attendance.checked_out';

  async handle(event: AttendanceCheckedOutEvent): Promise<void> {
    logger.info(`[AttendanceCheckedOutHandler] Processing attendance.checked_out event: ${event.aggregateId}`);
    
    try {
      // 1. Calculate working hours (already done in payload)
      await this.calculateWorkingHours(event.payload, event.organizationId);
      
      // 2. Check for early departure
      await this.checkEarlyDeparture(event.payload, event.organizationId);
      
      // 3. Calculate overtime if applicable
      await this.calculateOvertime(event.payload, event.organizationId);
      
      logger.info(`[AttendanceCheckedOutHandler] Successfully processed attendance.checked_out event`);
    } catch (error) {
      logger.error(`[AttendanceCheckedOutHandler] Error processing event:`, error);
      throw error;
    }
  }

  private async calculateWorkingHours(payload: AttendanceCheckedOutEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[AttendanceCheckedOutHandler] Working hours calculated: ${payload.workingHours} for employee ${payload.employeeId}`);
      
      // Store working hours summary in daily work log
      await query(
        `INSERT INTO daily_work_logs (
           organization_id, employee_id, work_date, 
           total_hours, check_in_time, check_out_time,
           created_at, updated_at
         ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (organization_id, employee_id, work_date)
         DO UPDATE SET
           total_hours = EXCLUDED.total_hours,
           check_out_time = EXCLUDED.check_out_time,
           updated_at = NOW()`,
        [
          organizationId,
          payload.employeeId,
          payload.workingHours,
          payload.checkInTime,
          payload.checkOutTime
        ]
      );
      
      logger.info(`[AttendanceCheckedOutHandler] Working hours stored in work log`);
    } catch (error) {
      logger.error(`[AttendanceCheckedOutHandler] Failed to store working hours:`, error);
    }
  }

  private async checkEarlyDeparture(payload: AttendanceCheckedOutEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[AttendanceCheckedOutHandler] Checking early departure for employee ${payload.employeeId}`);
      
      // Get employee shift information
      const shiftResult = await query(
        `SELECT 
           ws.shift_name, ws.end_time, ws.early_departure_threshold_minutes,
           e.first_name, e.last_name, e.manager_id,
           u_manager.email as manager_email
         FROM employees e
         LEFT JOIN shift_assignments sa ON e.employee_id = sa.employee_id 
           AND sa.is_active = TRUE
           AND CURRENT_DATE BETWEEN sa.effective_from AND COALESCE(sa.effective_to, CURRENT_DATE)
         LEFT JOIN work_shifts ws ON sa.shift_id = ws.shift_id
         LEFT JOIN users u_manager ON e.manager_id = u_manager.employee_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (shiftResult.rows.length === 0 || !shiftResult.rows[0].end_time) {
        logger.info(`[AttendanceCheckedOutHandler] No shift assigned or end time not defined`);
        return;
      }
      
      const shift = shiftResult.rows[0];
      const checkOutTime = new Date(payload.checkOutTime);
      
      // Parse shift end time
      const [hours, minutes] = shift.end_time.split(':').map(Number);
      const shiftEndTime = new Date(checkOutTime);
      shiftEndTime.setHours(hours, minutes, 0, 0);
      
      // Check if early departure
      if (checkOutTime < shiftEndTime) {
        const earlyMinutes = differenceInMinutes(shiftEndTime, checkOutTime);
        const threshold = shift.early_departure_threshold_minutes || 15;
        
        if (earlyMinutes > threshold) {
          logger.warn(`[AttendanceCheckedOutHandler] Employee ${shift.first_name} ${shift.last_name} left early by ${earlyMinutes} minutes`);
          
          // Record early departure violation
          await query(
            `INSERT INTO attendance_violations (
               organization_id, employee_id, attendance_id, violation_type,
               violation_date, early_by_minutes, description, status, created_at
             ) VALUES ($1, $2, $3, 'early_departure', $4, $5, $6, 'pending', NOW())
             ON CONFLICT (attendance_id, violation_type) DO NOTHING`,
            [
              organizationId,
              payload.employeeId,
              payload.attendanceId,
              payload.checkOutTime,
              earlyMinutes,
              `Left early by ${earlyMinutes} minutes. Shift end: ${shift.end_time}`
            ]
          );
          
          // Notify manager if significantly early
          if (earlyMinutes > 30 && shift.manager_email) {
            await emailService.sendEmail({
              to: shift.manager_email,
              subject: 'Early Departure Notification',
              html: `
                <h2>Early Departure Notification</h2>
                <p><strong>${shift.first_name} ${shift.last_name}</strong> checked out early today.</p>
                <ul>
                  <li><strong>Shift End Time:</strong> ${shift.end_time}</li>
                  <li><strong>Check-out Time:</strong> ${checkOutTime.toLocaleTimeString()}</li>
                  <li><strong>Early by:</strong> ${earlyMinutes} minutes</li>
                </ul>
              `
            });
          }
        }
      } else {
        logger.info(`[AttendanceCheckedOutHandler] Employee completed full shift`);
      }
    } catch (error) {
      logger.error(`[AttendanceCheckedOutHandler] Failed to check early departure:`, error);
    }
  }

  private async calculateOvertime(payload: AttendanceCheckedOutEvent['payload'], organizationId: string): Promise<void> {
    try {
      logger.info(`[AttendanceCheckedOutHandler] Calculating overtime for employee ${payload.employeeId}`);
      
      // Get employee shift and company overtime policy
      const policyResult = await query(
        `SELECT 
           ws.shift_name, ws.standard_hours, ws.overtime_threshold_hours,
           c.overtime_rate, c.overtime_policy
         FROM employees e
         LEFT JOIN shift_assignments sa ON e.employee_id = sa.employee_id 
           AND sa.is_active = TRUE
           AND CURRENT_DATE BETWEEN sa.effective_from AND COALESCE(sa.effective_to, CURRENT_DATE)
         LEFT JOIN work_shifts ws ON sa.shift_id = ws.shift_id
         LEFT JOIN companies c ON e.company_id = c.company_id
         WHERE e.employee_id = $1 AND e.organization_id = $2`,
        [payload.employeeId, organizationId]
      );
      
      if (policyResult.rows.length === 0) {
        logger.info(`[AttendanceCheckedOutHandler] No overtime policy found`);
        return;
      }
      
      const policy = policyResult.rows[0];
      const standardHours = parseFloat(policy.standard_hours || '8');
      const overtimeThreshold = parseFloat(policy.overtime_threshold_hours || standardHours);
      
      // Calculate overtime hours
      const workingHours = parseFloat(payload.workingHours);
      
      if (workingHours > overtimeThreshold) {
        const overtimeHours = workingHours - overtimeThreshold;
        
        logger.info(`[AttendanceCheckedOutHandler] Overtime detected: ${overtimeHours} hours`);
        
        // Record overtime
        await query(
          `INSERT INTO overtime_records (
             organization_id, employee_id, attendance_id, 
             overtime_date, overtime_hours, overtime_rate,
             status, created_at, updated_at
           ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'pending', NOW(), NOW())
           ON CONFLICT (attendance_id) DO UPDATE SET
             overtime_hours = EXCLUDED.overtime_hours,
             overtime_rate = EXCLUDED.overtime_rate,
             updated_at = NOW()`,
          [
            organizationId,
            payload.employeeId,
            payload.attendanceId,
            overtimeHours,
            policy.overtime_rate || 1.5
          ]
        );
        
        logger.info(`[AttendanceCheckedOutHandler] Overtime recorded: ${overtimeHours} hours at ${policy.overtime_rate || 1.5}x rate`);
      } else {
        logger.info(`[AttendanceCheckedOutHandler] No overtime - working hours within standard limits`);
      }
    } catch (error) {
      logger.error(`[AttendanceCheckedOutHandler] Failed to calculate overtime:`, error);
    }
  }
}

// =====================================================
// EVENT HANDLER REGISTRY
// =====================================================

export class EventHandlerRegistry {
  private handlers: Map<string, IEventHandler[]> = new Map();

  register(handler: IEventHandler): void {
    const key = `${handler.eventType}.${handler.eventName}`;
    
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.handlers.get(key)!.push(handler);
    logger.info(`[EventHandlerRegistry] Registered handler for ${key}`);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const key = `${event.eventType}.${event.eventName}`;
    const handlers = this.handlers.get(key) || [];

    if (handlers.length === 0) {
      logger.warn(`[EventHandlerRegistry] No handlers registered for ${key}`);
      return;
    }

    logger.info(`[EventHandlerRegistry] Dispatching ${key} to ${handlers.length} handler(s)`);

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        handler.handle(event).catch(error => {
          logger.error(`[EventHandlerRegistry] Handler failed for ${key}:`, error);
          // Don't throw - allow other handlers to execute
        })
      )
    );
  }

  getHandlers(eventType: string, eventName: string): IEventHandler[] {
    const key = `${eventType}.${eventName}`;
    return this.handlers.get(key) || [];
  }

  clear(): void {
    this.handlers.clear();
  }
}

// =====================================================
// DEFAULT REGISTRY SETUP
// =====================================================

export function createDefaultEventHandlerRegistry(): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();

  // Register employee handlers
  registry.register(new EmployeeCreatedHandler());

  // Register leave handlers
  registry.register(new LeaveRequestedHandler());
  registry.register(new LeaveApprovedHandler());
  registry.register(new LeaveRejectedHandler());

  // Register timesheet handlers
  registry.register(new TimesheetSubmittedHandler());
  registry.register(new TimesheetApprovedHandler());

  // Register attendance handlers
  registry.register(new AttendanceCheckedInHandler());
  registry.register(new AttendanceCheckedOutHandler());

  logger.info('[EventHandlerRegistry] Default handlers registered');

  return registry;
}
