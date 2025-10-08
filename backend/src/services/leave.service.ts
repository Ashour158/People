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
   * Apply for leave
   */
  async applyLeave(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      // Get leave type details
      const leaveTypeResult = await client.query(
        'SELECT * FROM leave_types WHERE leave_type_id = $1 AND organization_id = $2',
        [data.leave_type_id, organizationId]
      );

      if (leaveTypeResult.rows.length === 0) {
        throw new AppError(404, 'Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Calculate leave days
      const fromDate = new Date(data.from_date);
      const toDate = new Date(data.to_date);
      let totalDays = differenceInDays(toDate, fromDate) + 1;

      if (data.is_half_day) {
        totalDays = 0.5;
      }

      // Check leave balance
      const balanceResult = await client.query(
        `SELECT * FROM leave_balances 
         WHERE employee_id = $1 AND leave_type_id = $2`,
        [employeeId, data.leave_type_id]
      );

      if (balanceResult.rows.length > 0) {
        const balance = balanceResult.rows[0];
        if (balance.available_days < totalDays && !leaveType.allows_negative_balance) {
          throw new AppError(400, 'Insufficient leave balance');
        }
      }

      // Create leave application
      const result = await client.query(
        `INSERT INTO leave_applications (
          employee_id, organization_id, leave_type_id, from_date, to_date,
          is_half_day, half_day_session, total_days, reason, contact_details,
          supporting_document_url, leave_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NOW(), NOW())
        RETURNING *`,
        [
          employeeId,
          organizationId,
          data.leave_type_id,
          data.from_date,
          data.to_date,
          data.is_half_day,
          data.half_day_session,
          totalDays,
          data.reason,
          data.contact_details,
          data.supporting_document_url
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Get leave applications
   */
  async getLeaveApplications(organizationId: string, filters: any = {}) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['la.organization_id = $1'];
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.employee_id) {
      paramCount++;
      whereConditions.push(`la.employee_id = $${paramCount}`);
      params.push(filters.employee_id);
    }

    if (filters.leave_status) {
      paramCount++;
      whereConditions.push(`la.leave_status = $${paramCount}`);
      params.push(filters.leave_status);
    }

    if (filters.leave_type_id) {
      paramCount++;
      whereConditions.push(`la.leave_type_id = $${paramCount}`);
      params.push(filters.leave_type_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM leave_applications la WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT 
        la.*,
        e.employee_code, e.first_name, e.last_name,
        lt.leave_type_name, lt.leave_code, lt.color_code
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.employee_id
      JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
      WHERE ${whereClause}
      ORDER BY la.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      leaves: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }

  /**
   * Approve or reject leave
   */
  async approveRejectLeave(
    leaveApplicationId: string,
    organizationId: string,
    approverId: string,
    action: 'approve' | 'reject',
    data: any
  ) {
    return transaction(async (client) => {
      const result = await client.query(
        `UPDATE leave_applications 
         SET leave_status = $1, 
             ${action === 'approve' ? 'approved_by = $2, approved_at = NOW()' : 'rejected_by = $2, rejected_at = NOW()'},
             ${action === 'reject' ? 'rejection_reason = $4,' : ''}
             approver_comments = $3,
             updated_at = NOW()
         WHERE leave_application_id = $5 AND organization_id = $6 AND leave_status = 'pending'
         RETURNING *`,
        action === 'reject' 
          ? [action === 'approve' ? 'approved' : 'rejected', approverId, data.comments, data.rejection_reason, leaveApplicationId, organizationId]
          : [action === 'approve' ? 'approved' : 'rejected', approverId, data.comments, leaveApplicationId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Leave application not found or already processed');
      }

      // Update leave balance if approved
      if (action === 'approve') {
        const leave = result.rows[0];
        await client.query(
          `UPDATE leave_balances 
           SET used_days = used_days + $1,
               available_days = available_days - $1
           WHERE employee_id = $2 AND leave_type_id = $3`,
          [leave.total_days, leave.employee_id, leave.leave_type_id]
        );
      }

      return result.rows[0];
    });
  }

  /**
   * Get leave balance
   */
  async getLeaveBalance(employeeId: string, organizationId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    const result = await query(
      `SELECT 
        lb.*,
        lt.leave_type_name, lt.leave_code, lt.leave_category, lt.color_code, lt.icon
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
      WHERE lb.employee_id = $1 AND lb.organization_id = $2
      ORDER BY lt.leave_type_name`,
      [employeeId, organizationId]
    );

    return result.rows;
  }

  /**
   * Cancel leave request
   */
  async cancelLeave(
    leaveApplicationId: string,
    organizationId: string,
    employeeId: string,
    cancellationReason: string
  ) {
    return transaction(async (client) => {
      const result = await client.query(
        `UPDATE leave_applications
        SET 
          leave_status = 'cancelled',
          cancellation_reason = $1,
          updated_at = NOW()
        WHERE leave_application_id = $2 
          AND organization_id = $3
          AND employee_id = $4
          AND leave_status IN ('pending', 'approved')
        RETURNING *`,
        [cancellationReason, leaveApplicationId, organizationId, employeeId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Leave application not found or cannot be cancelled');
      }

      const leave = result.rows[0];

      // Restore leave balance if it was approved
      if (leave.leave_status === 'approved') {
        await client.query(
          `UPDATE leave_balances
          SET used_days = used_days - $1,
              available_days = available_days + $1
          WHERE employee_id = $2 AND leave_type_id = $3`,
          [leave.total_days, employeeId, leave.leave_type_id]
        );
      }

      return {
        message: 'Leave application cancelled successfully'
      };
    });
  }

  /**
   * Get pending leave approvals for a manager
   */
  async getPendingApprovals(approverId: string, organizationId: string) {
    const result = await query(
      `SELECT 
        la.leave_application_id, la.from_date, la.to_date, la.total_days,
        la.reason, la.created_at,
        e.employee_id, e.employee_code, e.first_name, e.last_name, 
        e.email, e.profile_picture_url,
        lt.leave_type_name, lt.leave_code, lt.color_code,
        d.department_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.employee_id
      JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE e.manager_id = $1
        AND la.organization_id = $2
        AND la.leave_status = 'pending'
      ORDER BY la.created_at ASC`,
      [approverId, organizationId]
    );

    return result.rows;
  }

  /**
   * Get team leaves (for managers)
   */
  async getTeamLeaves(managerId: string, organizationId: string, filters: any = {}) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['e.manager_id = $1', 'la.organization_id = $2'];
    const params: any[] = [managerId, organizationId];
    let paramCount = 2;

    if (filters.leave_status) {
      paramCount++;
      whereConditions.push(`la.leave_status = $${paramCount}`);
      params.push(filters.leave_status);
    }

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`la.from_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`la.to_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total 
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.employee_id
      WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT 
        la.*,
        e.employee_code, e.first_name, e.last_name, e.profile_picture_url,
        lt.leave_type_name, lt.color_code,
        d.department_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.employee_id
      JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE ${whereClause}
      ORDER BY la.from_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      leaves: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }

  /**
   * Get leave summary/statistics
   */
  async getLeaveSummary(employeeId: string, organizationId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const result = await query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE leave_status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE leave_status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE leave_status = 'rejected') as rejected_requests,
        COALESCE(SUM(total_days) FILTER (WHERE leave_status = 'approved'), 0) as total_days_taken,
        COALESCE(SUM(total_days) FILTER (WHERE leave_status = 'pending'), 0) as total_days_pending
      FROM leave_applications
      WHERE employee_id = $1 
        AND organization_id = $2
        AND EXTRACT(YEAR FROM from_date) = $3`,
      [employeeId, organizationId, targetYear]
    );

    return {
      year: targetYear,
      ...result.rows[0]
    };
  }

  /**
   * Get leave calendar (organization-wide or team view)
   */
  async getLeaveCalendar(
    organizationId: string,
    filters: any = {}
  ) {
    const whereConditions = ['la.organization_id = $1', 'la.leave_status = \'approved\''];
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.department_id) {
      paramCount++;
      whereConditions.push(`e.department_id = $${paramCount}`);
      params.push(filters.department_id);
    }

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`la.from_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`la.to_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    if (filters.employee_id) {
      paramCount++;
      whereConditions.push(`la.employee_id = $${paramCount}`);
      params.push(filters.employee_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT 
        la.leave_application_id, la.from_date, la.to_date, la.total_days,
        la.is_half_day, la.half_day_session,
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.profile_picture_url,
        lt.leave_type_name, lt.color_code,
        d.department_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.employee_id
      JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE ${whereClause}
      ORDER BY la.from_date ASC`,
      params
    );

    return result.rows;
  }

  /**
   * Get leave statistics for organization
   */
  async getLeaveStats(organizationId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const result = await query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE leave_status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE leave_status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE leave_status = 'rejected') as rejected_requests,
        COALESCE(SUM(total_days) FILTER (WHERE leave_status = 'approved'), 0) as total_days_approved,
        COUNT(DISTINCT employee_id) as employees_on_leave
      FROM leave_applications
      WHERE organization_id = $1
        AND EXTRACT(YEAR FROM from_date) = $2`,
      [organizationId, targetYear]
    );

    return {
      year: targetYear,
      ...result.rows[0]
    };
  }

  /**
   * Get my leave history
   */
  async getMyLeaveHistory(
    employeeId: string,
    organizationId: string,
    filters: any = {}
  ) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['la.employee_id = $1', 'la.organization_id = $2'];
    const params: any[] = [employeeId, organizationId];
    let paramCount = 2;

    if (filters.leave_status) {
      paramCount++;
      whereConditions.push(`la.leave_status = $${paramCount}`);
      params.push(filters.leave_status);
    }

    if (filters.year) {
      paramCount++;
      whereConditions.push(`EXTRACT(YEAR FROM la.from_date) = $${paramCount}`);
      params.push(filters.year);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM leave_applications la WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT 
        la.*,
        lt.leave_type_name, lt.leave_code, lt.color_code
      FROM leave_applications la
      JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
      WHERE ${whereClause}
      ORDER BY la.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      leaves: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }

  /**
   * Check leave eligibility
   */
  async checkLeaveEligibility(
    employeeId: string,
    organizationId: string,
    leaveTypeId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get leave type details
    const leaveTypeResult = await query(
      'SELECT * FROM leave_types WHERE leave_type_id = $1 AND organization_id = $2',
      [leaveTypeId, organizationId]
    );

    if (leaveTypeResult.rows.length === 0) {
      return {
        eligible: false,
        reason: 'Leave type not found'
      };
    }

    const leaveType = leaveTypeResult.rows[0];

    // Calculate days
    const daysDiff = differenceInDays(toDate, fromDate) + 1;

    // Check min/max days
    if (leaveType.min_days_per_request && daysDiff < leaveType.min_days_per_request) {
      return {
        eligible: false,
        reason: `Minimum ${leaveType.min_days_per_request} days required`
      };
    }

    if (leaveType.max_days_per_request && daysDiff > leaveType.max_days_per_request) {
      return {
        eligible: false,
        reason: `Maximum ${leaveType.max_days_per_request} days allowed`
      };
    }

    // Check leave balance
    const balanceResult = await query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2',
      [employeeId, leaveTypeId]
    );

    if (balanceResult.rows.length > 0) {
      const balance = balanceResult.rows[0];
      if (balance.available_days < daysDiff && !leaveType.allows_negative_balance) {
        return {
          eligible: false,
          reason: `Insufficient leave balance. Available: ${balance.available_days} days`
        };
      }
    }

    return {
      eligible: true,
      days: daysDiff
    };
  }
}
