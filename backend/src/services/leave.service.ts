import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';
import { differenceInDays } from 'date-fns';

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
    
    let whereConditions = ['la.organization_id = $1'];
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
          ? ['rejected', approverId, data.comments, data.rejection_reason, leaveApplicationId, organizationId]
          : ['approved', approverId, data.comments, leaveApplicationId, organizationId]
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
  async getLeaveBalance(employeeId: string, organizationId: string) {
    const result = await query(
      `SELECT 
        lb.*,
        lt.leave_type_name, lt.leave_code, lt.color_code
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
      WHERE lb.employee_id = $1 AND lb.organization_id = $2
      ORDER BY lt.leave_type_name`,
      [employeeId, organizationId]
    );

    return result.rows;
  }
}
