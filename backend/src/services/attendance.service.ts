import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';
import { format, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns';

export class AttendanceService {
  /**
   * Check-in employee
   */
  async checkIn(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      // Check if already checked in today
      const today = format(new Date(), 'yyyy-MM-dd');
      const existingCheck = await client.query(
        `SELECT attendance_id FROM attendance 
         WHERE employee_id = $1 AND attendance_date = $2 AND check_out_time IS NULL`,
        [employeeId, today]
      );

      if (existingCheck.rows.length > 0) {
        throw new AppError(400, 'Already checked in today');
      }

      const result = await client.query(
        `INSERT INTO attendance (
          employee_id, organization_id, attendance_date, check_in_time,
          check_in_location, check_in_notes, attendance_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'present', NOW(), NOW())
        RETURNING *`,
        [
          employeeId,
          organizationId,
          today,
          data.check_in_time || new Date(),
          data.location,
          data.notes
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Check-out employee
   */
  async checkOut(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const result = await client.query(
        `UPDATE attendance 
         SET check_out_time = $1, check_out_location = $2, check_out_notes = $3,
             total_hours = EXTRACT(EPOCH FROM ($1 - check_in_time)) / 3600,
             updated_at = NOW()
         WHERE employee_id = $4 AND attendance_date = $5 AND check_out_time IS NULL
         RETURNING *`,
        [
          data.check_out_time || new Date(),
          data.location,
          data.notes,
          employeeId,
          today
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(400, 'No active check-in found for today');
      }

      return result.rows[0];
    });
  }

  /**
   * Get attendance records
   */
  async getAttendance(organizationId: string, filters: any = {}) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['a.organization_id = $1'];
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.employee_id) {
      paramCount++;
      whereConditions.push(`a.employee_id = $${paramCount}`);
      params.push(filters.employee_id);
    }

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`a.attendance_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`a.attendance_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM attendance a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT 
        a.*,
        e.employee_code, e.first_name, e.last_name,
        d.department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC, a.check_in_time DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      attendance: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }

  /**
   * Request attendance regularization
   */
  async requestRegularization(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO attendance_regularizations (
          employee_id, organization_id, attendance_date,
          requested_check_in, requested_check_out, reason,
          supporting_document_url, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
        RETURNING *`,
        [
          employeeId,
          organizationId,
          data.attendance_date,
          data.requested_check_in,
          data.requested_check_out,
          data.reason,
          data.supporting_document_url
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Get attendance summary for an employee
   */
  async getAttendanceSummary(
    employeeId: string,
    organizationId: string,
    month?: number,
    year?: number
  ) {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const result = await query(
      `SELECT 
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE attendance_status = 'present') as present_days,
        COUNT(*) FILTER (WHERE attendance_status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE attendance_status = 'half_day') as half_days,
        COUNT(*) FILTER (WHERE attendance_status = 'on_leave') as leave_days,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(AVG(total_hours) FILTER (WHERE attendance_status = 'present'), 0) as avg_hours_per_day
      FROM attendance
      WHERE employee_id = $1 
        AND organization_id = $2
        AND EXTRACT(MONTH FROM attendance_date) = $3
        AND EXTRACT(YEAR FROM attendance_date) = $4`,
      [employeeId, organizationId, targetMonth, targetYear]
    );

    return {
      month: targetMonth,
      year: targetYear,
      ...result.rows[0]
    };
  }

  /**
   * Process regularization request (approve/reject)
   */
  async processRegularization(
    regularizationId: string,
    organizationId: string,
    approverId: string,
    action: 'approve' | 'reject',
    comments?: string
  ) {
    return transaction(async (client) => {
      // Get regularization details
      const regResult = await client.query(
        `SELECT * FROM attendance_regularizations
        WHERE regularization_id = $1 AND organization_id = $2`,
        [regularizationId, organizationId]
      );

      if (regResult.rows.length === 0) {
        throw new AppError(404, 'Regularization request not found');
      }

      const regularization = regResult.rows[0];

      if (regularization.status !== 'pending') {
        throw new AppError(400, 'Regularization already processed');
      }

      // Update regularization status
      const statusValue = action === 'approve' ? 'approved' : 'rejected';
      await client.query(
        `UPDATE attendance_regularizations
        SET status = $1, approved_at = NOW(), approval_comments = $2, updated_at = NOW()
        WHERE regularization_id = $3`,
        [statusValue, comments, regularizationId]
      );

      if (action === 'approve') {
        // Check if attendance record exists
        const attendanceCheck = await client.query(
          `SELECT attendance_id FROM attendance 
          WHERE employee_id = $1 AND attendance_date = $2`,
          [regularization.employee_id, regularization.attendance_date]
        );

        if (attendanceCheck.rows.length > 0) {
          // Update existing attendance
          await client.query(
            `UPDATE attendance
            SET 
              check_in_time = $1,
              check_out_time = $2,
              total_hours = EXTRACT(EPOCH FROM ($2 - $1)) / 3600,
              updated_at = NOW()
            WHERE attendance_id = $3`,
            [
              regularization.requested_check_in,
              regularization.requested_check_out,
              attendanceCheck.rows[0].attendance_id
            ]
          );
        } else {
          // Create new attendance record
          const today = format(new Date(regularization.attendance_date), 'yyyy-MM-dd');
          await client.query(
            `INSERT INTO attendance (
              employee_id, organization_id, attendance_date,
              check_in_time, check_out_time, attendance_status,
              total_hours, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'present',
              EXTRACT(EPOCH FROM ($5 - $4)) / 3600, NOW(), NOW())`,
            [
              regularization.employee_id,
              organizationId,
              today,
              regularization.requested_check_in,
              regularization.requested_check_out
            ]
          );
        }
      }

      return {
        message: `Regularization ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      };
    });
  }

  /**
   * Get team attendance (for managers)
   */
  async getTeamAttendance(managerId: string, organizationId: string, date?: string) {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.profile_picture_url,
        d.department_name,
        a.attendance_id, a.attendance_date, a.check_in_time, a.check_out_time,
        a.attendance_status, a.total_hours
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.attendance_date = $3
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE e.manager_id = $1 
        AND e.organization_id = $2 
        AND e.is_deleted = FALSE
        AND e.employee_status IN ('active', 'on_probation', 'on_leave')
      ORDER BY a.check_in_time DESC, e.first_name`,
      [managerId, organizationId, targetDate]
    );

    return result.rows;
  }

  /**
   * Get pending regularization requests
   */
  async getPendingRegularizations(organizationId: string, approverId?: string) {
    let whereClause = 'ar.organization_id = $1 AND ar.status = \'pending\'';
    const params: any[] = [organizationId];

    if (approverId) {
      // Filter by manager's team
      whereClause += ' AND e.manager_id = $2';
      params.push(approverId);
    }

    const result = await query(
      `SELECT 
        ar.*,
        e.employee_code, e.first_name, e.last_name, e.email,
        d.department_name
      FROM attendance_regularizations ar
      JOIN employees e ON ar.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE ${whereClause}
      ORDER BY ar.created_at DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Get attendance statistics for organization
   */
  async getAttendanceStats(organizationId: string, date?: string) {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    const result = await query(
      `SELECT 
        COUNT(DISTINCT e.employee_id) as total_employees,
        COUNT(a.attendance_id) as marked_attendance,
        COUNT(*) FILTER (WHERE a.attendance_status = 'present') as present_count,
        COUNT(*) FILTER (WHERE a.attendance_status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE a.attendance_status = 'on_leave') as on_leave_count,
        COUNT(*) FILTER (WHERE a.attendance_status = 'half_day') as half_day_count,
        COALESCE(AVG(a.total_hours) FILTER (WHERE a.attendance_status = 'present'), 0) as avg_hours
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.attendance_date = $2
      WHERE e.organization_id = $1 
        AND e.is_deleted = FALSE
        AND e.employee_status = 'active'`,
      [organizationId, targetDate]
    );

    return result.rows[0];
  }

  /**
   * Bulk mark attendance
   */
  async bulkMarkAttendance(organizationId: string, data: any[]) {
    return transaction(async (client) => {
      const results = [];

      for (const item of data) {
        const result = await client.query(
          `INSERT INTO attendance (
            employee_id, organization_id, attendance_date,
            attendance_status, check_in_notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (employee_id, attendance_date) 
          DO UPDATE SET 
            attendance_status = EXCLUDED.attendance_status,
            check_in_notes = EXCLUDED.check_in_notes,
            updated_at = NOW()
          RETURNING *`,
          [
            item.employee_id,
            organizationId,
            item.attendance_date,
            item.attendance_status || 'present',
            item.notes
          ]
        );

        results.push(result.rows[0]);
      }

      return results;
    });
  }

  /**
   * Get my attendance history
   */
  async getMyAttendanceHistory(
    employeeId: string,
    organizationId: string,
    filters: any = {}
  ) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['a.employee_id = $1', 'a.organization_id = $2'];
    const params: any[] = [employeeId, organizationId];
    let paramCount = 2;

    if (filters.from_date) {
      paramCount++;
      whereConditions.push(`a.attendance_date >= $${paramCount}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      paramCount++;
      whereConditions.push(`a.attendance_date <= $${paramCount}`);
      params.push(filters.to_date);
    }

    if (filters.status) {
      paramCount++;
      whereConditions.push(`a.attendance_status = $${paramCount}`);
      params.push(filters.status);
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM attendance a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT 
        a.*,
        e.employee_code, e.first_name, e.last_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      attendance: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }
}
