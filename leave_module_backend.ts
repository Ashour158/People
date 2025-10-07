// =====================================================
// LEAVE MANAGEMENT MODULE - COMPLETE BACKEND
// =====================================================

// ===== src/validators/leave.validator.ts =====
import Joi from 'joi';

export const applyLeaveSchema = Joi.object({
  leave_type_id: Joi.string().uuid().required(),
  from_date: Joi.date().required(),
  to_date: Joi.date().min(Joi.ref('from_date')).required(),
  is_half_day: Joi.boolean().default(false),
  half_day_session: Joi.string().valid('first_half', 'second_half').when('is_half_day', {
    is: true,
    then: Joi.required()
  }),
  reason: Joi.string().min(10).max(500).required(),
  contact_details: Joi.string().max(255).optional(),
  supporting_document_url: Joi.string().uri().optional(),
  delegate_to_employee_id: Joi.string().uuid().optional()
});

export const approveRejectLeaveSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().max(500).optional(),
  rejection_reason: Joi.string().when('action', {
    is: 'reject',
    then: Joi.required()
  })
});

export const cancelLeaveSchema = Joi.object({
  cancellation_reason: Joi.string().min(10).required()
});

// ===== src/services/leave.service.ts =====
import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';
import { differenceInDays, isWeekend, format } from 'date-fns';

export class LeaveService {
  /**
   * Get leave types
   */
  async getLeaveTypes(organizationId: string, companyId?: string) {
    let whereClause = 'organization_id = $1 AND is_active = TRUE AND is_deleted = FALSE';
    const params: any[] = [organizationId];

    if (companyId) {
      whereClause += ' AND (company_id = $2 OR company_id IS NULL)';
      params.push(companyId);
    }

    const result = await query(
      `SELECT 
        leave_type_id, leave_type_name, leave_code, leave_category,
        description, is_paid, allocation_frequency, default_days_per_year,
        min_days_per_request, max_days_per_request, max_consecutive_days,
        can_carry_forward, max_carry_forward_days, allows_negative_balance,
        requires_document, notice_period_days, allows_half_day,
        includes_weekends, includes_holidays, color_code, icon
      FROM leave_types
      WHERE ${whereClause}
      ORDER BY display_order, leave_type_name`,
      params
    );

    return result.rows;
  }

  /**
   * Get leave balance for employee
   */
  async getLeaveBalance(employeeId: string, organizationId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const result = await query(
      `SELECT 
        lb.*,
        lt.leave_type_name, lt.leave_code, lt.leave_category, lt.color_code
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
      WHERE lb.employee_id = $1 
        AND lb.organization_id = $2
        AND lb.year = $3
      ORDER BY lt.display_order, lt.leave_type_name`,
      [employeeId, organizationId, targetYear]
    );

    return result.rows;
  }

  /**
   * Calculate working days between dates
   */
  private async calculateLeaveDays(
    fromDate: Date,
    toDate: Date,
    organizationId: string,
    employeeId: string,
    leaveTypeId: string,
    isHalfDay: boolean
  ): Promise<{ working_days: number; weekend_days: number; holiday_days: number; total_days: number }> {
    // Get leave type settings
    const leaveTypeResult = await query(
      'SELECT includes_weekends, includes_holidays FROM leave_types WHERE leave_type_id = $1',
      [leaveTypeId]
    );

    const leaveType = leaveTypeResult.rows[0];

    // Get employee location for holiday check
    const empResult = await query(
      'SELECT location_id FROM employees WHERE employee_id = $1',
      [employeeId]
    );

    let workingDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    
    // Get holidays in date range
    const holidayResult = await query(
      `SELECT holiday_date FROM holidays
      WHERE organization_id = $1
        AND holiday_date BETWEEN $2 AND $3
        AND is_active = TRUE
        AND (location_ids IS NULL OR $4 = ANY(location_ids))`,
      [organizationId, fromDate, toDate, empResult.rows[0]?.location_id]
    );

    const holidays = new Set(holidayResult.rows.map(h => format(h.holiday_date, 'yyyy-MM-dd')));

    // Iterate through dates
    let currentDate = new Date(fromDate);
    const endDate = new Date(toDate);

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const isWeekendDay = isWeekend(currentDate);
      const isHolidayDay = holidays.has(dateStr);

      if (isWeekendDay) {
        weekendDays++;
        if (leaveType.includes_weekends) {
          workingDays++;
        }
      } else if (isHolidayDay) {
        holidayDays++;
        if (leaveType.includes_holidays) {
          workingDays++;
        }
      } else {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (isHalfDay) {
      workingDays = 0.5;
    }

    const totalDays = differenceInDays(toDate, fromDate) + 1;

    return {
      working_days: workingDays,
      weekend_days: weekendDays,
      holiday_days: holidayDays,
      total_days: totalDays
    };
  }

  /**
   * Apply for leave
   */
  async applyLeave(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      // Get employee details
      const empResult = await client.query(
        `SELECT company_id, reporting_manager_id, employee_status
        FROM employees 
        WHERE employee_id = $1 AND organization_id = $2`,
        [employeeId, organizationId]
      );

      if (empResult.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      const employee = empResult.rows[0];

      // Validate leave type
      const leaveTypeResult = await client.query(
        `SELECT * FROM leave_types 
        WHERE leave_type_id = $1 AND organization_id = $2 AND is_active = TRUE`,
        [data.leave_type_id, organizationId]
      );

      if (leaveTypeResult.rows.length === 0) {
        throw new AppError(404, 'Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Check if on probation
      if (!leaveType.can_apply_on_probation && employee.employee_status === 'on_probation') {
        throw new AppError(400, 'Cannot apply for this leave type during probation');
      }

      // Calculate leave days
      const leaveDays = await this.calculateLeaveDays(
        new Date(data.from_date),
        new Date(data.to_date),
        organizationId,
        employeeId,
        data.leave_type_id,
        data.is_half_day
      );

      // Validate min/max days
      if (leaveDays.working_days < leaveType.min_days_per_request) {
        throw new AppError(400, `Minimum ${leaveType.min_days_per_request} days required`);
      }

      if (leaveType.max_days_per_request && leaveDays.working_days > leaveType.max_days_per_request) {
        throw new AppError(400, `Maximum ${leaveType.max_days_per_request} days allowed`);
      }

      // Check leave balance
      const year = new Date(data.from_date).getFullYear();
      const balanceResult = await client.query(
        `SELECT * FROM leave_balances
        WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3`,
        [employeeId, data.leave_type_id, year]
      );

      if (balanceResult.rows.length === 0) {
        throw new AppError(400, 'No leave balance found for this leave type');
      }

      const balance = balanceResult.rows[0];

      if (balance.available_days < leaveDays.working_days) {
        if (!leaveType.allows_negative_balance) {
          throw new AppError(400, `Insufficient leave balance. Available: ${balance.available_days} days`);
        }
      }

      // Generate request number
      const requestNumber = await this.generateLeaveRequestNumber(client, organizationId);

      // Create leave request
      const leaveResult = await client.query(
        `INSERT INTO leave_requests (
          organization_id, company_id, request_number, employee_id, leave_type_id,
          from_date, to_date, is_half_day, half_day_session, total_days,
          working_days, weekend_days, holiday_days, reason, contact_details,
          supporting_document_url, delegate_to_employee_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending')
        RETURNING *`,
        [
          organizationId,
          employee.company_id,
          requestNumber,
          employeeId,
          data.leave_type_id,
          data.from_date,
          data.to_date,
          data.is_half_day,
          data.half_day_session,
          leaveDays.total_days,
          leaveDays.working_days,
          leaveDays.weekend_days,
          leaveDays.holiday_days,
          data.reason,
          data.contact_details,
          data.supporting_document_url,
          data.delegate_to_employee_id
        ]
      );

      const leaveRequest = leaveResult.rows[0];

      // Update pending balance
      await client.query(
        `UPDATE leave_balances 
        SET pending_approval_days = pending_approval_days + $1
        WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leaveDays.working_days, employeeId, data.leave_type_id, year]
      );

      // Create approval workflow
      if (employee.reporting_manager_id) {
        await client.query(
          `INSERT INTO leave_approval_workflow (
            organization_id, leave_request_id, approval_level, 
            approver_id, approver_type, status
          ) VALUES ($1, $2, 1, $3, 'reporting_manager', 'pending')`,
          [organizationId, leaveRequest.leave_request_id, employee.reporting_manager_id]
        );

        // Send notification to manager
        await client.query(
          `INSERT INTO notifications (
            organization_id, user_id, notification_type, category,
            title, message, action_url
          ) VALUES (
            $1,
            (SELECT user_id FROM users WHERE employee_id = $2),
            'info',
            'leave',
            'Leave Approval Request',
            $3,
            '/leave/approvals/' || $4
          )`,
          [
            organizationId,
            employee.reporting_manager_id,
            `Leave request from employee for ${leaveDays.working_days} days`,
            leaveRequest.leave_request_id
          ]
        );
      }

      return leaveRequest;
    });
  }

  /**
   * Approve or reject leave
   */
  async processLeaveRequest(
    leaveRequestId: string,
    organizationId: string,
    approverId: string,
    action: 'approve' | 'reject',
    comments?: string,
    rejectionReason?: string
  ) {
    return transaction(async (client) => {
      // Get leave request
      const leaveResult = await client.query(
        `SELECT lr.*, e.full_name as employee_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.employee_id
        WHERE lr.leave_request_id = $1 AND lr.organization_id = $2`,
        [leaveRequestId, organizationId]
      );

      if (leaveResult.rows.length === 0) {
        throw new AppError(404, 'Leave request not found');
      }

      const leaveRequest = leaveResult.rows[0];

      if (leaveRequest.status !== 'pending') {
        throw new AppError(400, 'Leave request already processed');
      }

      // Check if approver is authorized
      const workflowResult = await client.query(
        `SELECT * FROM leave_approval_workflow
        WHERE leave_request_id = $1 AND approver_id = $2 AND status = 'pending'`,
        [leaveRequestId, approverId]
      );

      if (workflowResult.rows.length === 0) {
        throw new AppError(403, 'Not authorized to approve this leave request');
      }

      // Update workflow
      await client.query(
        `UPDATE leave_approval_workflow
        SET status = $1, comments = $2, action_date = NOW()
        WHERE leave_request_id = $3 AND approver_id = $4`,
        [action === 'approve' ? 'approved' : 'rejected', comments, leaveRequestId, approverId]
      );

      // Update leave request
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      await client.query(
        `UPDATE leave_requests
        SET 
          status = $1,
          final_approver_id = $2,
          final_approval_notes = $3,
          rejection_reason = $4,
          ${action === 'approve' ? 'approved_date' : 'rejected_date'} = NOW()
        WHERE leave_request_id = $5`,
        [newStatus, approverId, comments, rejectionReason, leaveRequestId]
      );

      if (action === 'approve') {
        // Update leave balance - move from pending to used
        await client.query(
          `UPDATE leave_balances
          SET 
            used_days = used_days + $1,
            pending_approval_days = pending_approval_days - $1
          WHERE employee_id = $2 AND leave_type_id = $3 
            AND year = EXTRACT(YEAR FROM $4::date)`,
          [
            leaveRequest.working_days,
            leaveRequest.employee_id,
            leaveRequest.leave_type_id,
            leaveRequest.from_date
          ]
        );

        // Mark attendance as on_leave for approved dates
        await client.query(
          `INSERT INTO attendance (
            organization_id, company_id, employee_id, attendance_date,
            attendance_status, notes
          )
          SELECT 
            $1, $2, $3, generate_series($4::date, $5::date, '1 day'::interval),
            'on_leave', 'Leave: ' || $6
          ON CONFLICT (employee_id, attendance_date) 
          DO UPDATE SET attendance_status = 'on_leave'`,
          [
            organizationId,
            leaveRequest.company_id,
            leaveRequest.employee_id,
            leaveRequest.from_date,
            leaveRequest.to_date,
            leaveRequest.request_number
          ]
        );
      } else {
        // Rejected - return to available balance
        await client.query(
          `UPDATE leave_balances
          SET pending_approval_days = pending_approval_days - $1
          WHERE employee_id = $2 AND leave_type_id = $3
            AND year = EXTRACT(YEAR FROM $4::date)`,
          [
            leaveRequest.working_days,
            leaveRequest.employee_id,
            leaveRequest.leave_type_id,
            leaveRequest.from_date
          ]
        );
      }

      // Send notification to employee
      await client.query(
        `INSERT INTO notifications (
          organization_id, user_id, notification_type, category,
          title, message, action_url
        ) VALUES (
          $1,
          (SELECT user_id FROM users WHERE employee_id = $2),
          $3,
          'leave',
          'Leave Request ' || $4,
          'Your leave request ' || $5 || ' has been ' || $4,
          '/leave/requests/' || $6
        )`,
        [
          organizationId,
          leaveRequest.employee_id,
          action === 'approve' ? 'success' : 'warning',
          action === 'approve' ? 'Approved' : 'Rejected',
          leaveRequest.request_number,
          leaveRequestId
        ]
      );

      return {
        message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      };
    });
  }

  /**
   * Get leave requests with filters
   */
  async getLeaveRequests(organizationId: string, filters: any) {
    const { page, limit, offset } = getPagination(filters.page, filters.limit);
    
    let whereConditions = ['lr.organization_id = $1', 'lr.is_deleted = FALSE'];
    let params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.employee_id) {
      paramCount++;
      whereConditions.push(`lr.employee_id = $${paramCount}`);
      params.push(filters.employee_id);
    }

    if (filters.status) {
      paramCount++;
      whereConditions.push(`lr.status = $${paramCount}`);
      params.push(filters.status);
    }

    if (filters.leave_type_id) {
      paramCount++;
      whereConditions.push(`lr.leave_type_id = $${paramCount}`);
      params.push(filters.leave_type_id);
    }

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`lr.from_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`lr.to_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM leave_requests lr WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const sql = `
      SELECT 
        lr.*,
        e.employee_code, e.full_name, e.email, e.profile_picture_url,
        lt.leave_type_name, lt.leave_code, lt.leave_category, lt.color_code,
        d.department_name,
        approver.full_name as approver_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.employee_id
      JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN employees approver ON lr.final_approver_id = approver.employee_id
      WHERE ${whereClause}
      ORDER BY lr.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await query(sql, params);

    return {
      leave_requests: result.rows,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(
    leaveRequestId: string,
    organizationId: string,
    employeeId: string,
    cancellationReason: string
  ) {
    return transaction(async (client) => {
      const result = await client.query(
        `UPDATE leave_requests
        SET 
          status = 'cancelled',
          cancelled_by = $1,
          cancelled_at = NOW(),
          cancellation_reason = $2
        WHERE leave_request_id = $3 
          AND organization_id = $4
          AND employee_id = $1
          AND status IN ('pending', 'approved')
        RETURNING *`,
        [employeeId, cancellationReason, leaveRequestId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Leave request not found or cannot be cancelled');
      }

      const leaveRequest = result.rows[0];

      // Update leave balance
      if (leaveRequest.status === 'approved') {
        await client.query(
          `UPDATE leave_balances
          SET used_days = used_days - $1
          WHERE employee_id = $2 AND leave_type_id = $3
            AND year = EXTRACT(YEAR FROM $4::date)`,
          [
            leaveRequest.working_days,
            employeeId,
            leaveRequest.leave_type_id,
            leaveRequest.from_date
          ]
        );
      } else {
        await client.query(
          `UPDATE leave_balances
          SET pending_approval_days = pending_approval_days - $1
          WHERE employee_id = $2 AND leave_type_id = $3
            AND year = EXTRACT(YEAR FROM $4::date)`,
          [
            leaveRequest.working_days,
            employeeId,
            leaveRequest.leave_type_id,
            leaveRequest.from_date
          ]
        );
      }

      return {
        message: 'Leave request cancelled successfully'
      };
    });
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovals(approverId: string, organizationId: string) {
    const result = await query(
      `SELECT 
        lr.leave_request_id, lr.request_number, lr.from_date, lr.to_date,
        lr.working_days, lr.reason, lr.applied_date,
        e.employee_code, e.full_name, e.email, e.profile_picture_url,
        lt.leave_type_name, lt.color_code,
        law.approval_level
      FROM leave_requests lr
      JOIN leave_approval_workflow law ON lr.leave_request_id = law.leave_request_id
      JOIN employees e ON lr.employee_id = e.employee_id
      JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
      WHERE law.approver_id = $1
        AND lr.organization_id = $2
        AND law.status = 'pending'
        AND lr.status = 'pending'
      ORDER BY lr.applied_date ASC`,
      [approverId, organizationId]
    );

    return result.rows;
  }

  /**
   * Generate leave request number
   */
  private async generateLeaveRequestNumber(client: any, organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) + 1 as next_num
      FROM leave_requests
      WHERE organization_id = $1 
        AND EXTRACT(YEAR FROM created_at) = $2`,
      [organizationId, year]
    );

    const nextNum = result.rows[0].next_num;
    return `LR-${year}-${String(nextNum).padStart(5, '0')}`;
  }

  /**
   * Get leave calendar (team view)
   */
  async getLeaveCalendar(
    organizationId: string,
    filters: any
  ) {
    let whereConditions = ['lr.organization_id = $1', 'lr.status = \'approved\''];
    let params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.department_id) {
      paramCount++;
      whereConditions.push(`e.department_id = $${paramCount}`);
      params.push(filters.department_id);
    }

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`lr.to_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`lr.from_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT 
        lr.leave_request_id, lr.from_date, lr.to_date, lr.working_days,
        e.employee_id, e.employee_code, e.full_name, e.profile_picture_url,
        lt.leave_type_name, lt.color_code,
        d.department_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.employee_id
      JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE ${whereClause}
      ORDER BY lr.from_date, e.full_name`,
      params
    );

    return result.rows;
  }
}

// ===== src/controllers/leave.controller.ts =====
import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { successResponse } from '../utils/response';

const leaveService = new LeaveService();

export class LeaveController {
  async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const companyId = req.query.company_id as string;
      
      const result = await leaveService.getLeaveTypes(organizationId, companyId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.employee_id || (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      const year = parseInt(req.query.year as string);
      
      const result = await leaveService.getLeaveBalance(employeeId, organizationId, year);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async applyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      const result = await leaveService.applyLeave(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Leave request submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLeaveRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const filters = req.query;
      
      // If not admin, show only own requests
      if (!filters.employee_id && !(req as any).user.permissions.includes('leave.view_all')) {
        filters.employee_id = (req as any).user.employee_id;
      }
      
      const result = await leaveService.getLeaveRequests(organizationId, filters);
      return successResponse(res, result.leave_requests, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async processLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, comments, rejection_reason } = req.body;
      const organizationId = (req as any).user.organization_id;
      const approverId = (req as any).user.employee_id;
      
      const result = await leaveService.processLeaveRequest(
        id,
        organizationId,
        approverId,
        action,
        comments,
        rejection_reason
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async cancelLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;
      const employeeId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      const result = await leaveService.cancelLeaveRequest(
        id,
        organizationId,
        employeeId,
        cancellation_reason
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const approverId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      const result = await leaveService.getPendingApprovals(approverId, organizationId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const filters = req.query;
      
      const result = await leaveService.getLeaveCalendar(organizationId, filters);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

// ===== src/routes/leave.routes.ts =====
import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { validate } from '../middleware/validation';
import { authorize } from '../middleware/authorize';
import {
  applyLeaveSchema,
  approveRejectLeaveSchema,
  cancelLeaveSchema
} from '../validators/leave.validator';

const router = Router();
const leaveController = new LeaveController();

// Leave types and balance
router.get('/types', leaveController.getLeaveTypes);
router.get('/balance/:employee_id?', authorize('leave.view'), leaveController.getLeaveBalance);

// Leave requests
router.get('/requests', authorize('leave.view'), leaveController.getRequests);
router.post('/requests', validate(applyLeaveSchema), leaveController.applyLeave);
router.post('/requests/:id/process', authorize('leave.approve'), validate(approveRejectLeaveSchema), leaveController.processLeaveRequest);
router.post('/requests/:id/cancel', validate(cancelLeaveSchema), leaveController.cancelLeaveRequest);

// Approvals
router.get('/approvals/pending', authorize('leave.approve'), leaveController.getPendingApprovals);

// Calendar
router.get('/calendar', authorize('leave.view'), leaveController.getLeaveCalendar);

export default router;

// =====================================================
// Leave Management Module Complete
// =====================================================