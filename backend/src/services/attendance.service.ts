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
    
    let whereConditions = ['a.organization_id = $1'];
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
}
