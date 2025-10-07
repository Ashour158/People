// =====================================================
// ATTENDANCE MANAGEMENT MODULE - COMPLETE IMPLEMENTATION
// =====================================================

// ===== src/validators/attendance.validator.ts =====
import Joi from 'joi';

export const checkInSchema = Joi.object({
  check_in_time: Joi.date().default(() => new Date()),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location: Joi.string().max(255).optional(),
  ip_address: Joi.string().ip().optional(),
  device: Joi.string().max(100).optional(),
  photo_url: Joi.string().uri().optional(),
  work_type: Joi.string().valid('office', 'remote', 'client_site', 'field_work').default('office')
});

export const checkOutSchema = Joi.object({
  attendance_id: Joi.string().uuid().required(),
  check_out_time: Joi.date().default(() => new Date()),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().optional()
});

export const regularizationSchema = Joi.object({
  attendance_date: Joi.date().max('now').required(),
  requested_check_in: Joi.date().required(),
  requested_check_out: Joi.date().required(),
  reason: Joi.string().min(10).required(),
  supporting_document_url: Joi.string().uri().optional()
});

// ===== src/services/attendance.service.ts =====
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
      // Get employee details with shift
      const empResult = await client.query(
        `SELECT 
          e.employee_id, e.company_id, e.employee_status,
          sa.shift_id,
          ws.start_time, ws.end_time, ws.grace_period_minutes
        FROM employees e
        LEFT JOIN shift_assignments sa ON e.employee_id = sa.employee_id 
          AND sa.is_active = TRUE
          AND CURRENT_DATE BETWEEN sa.effective_from AND COALESCE(sa.effective_to, CURRENT_DATE)
        LEFT JOIN work_shifts ws ON sa.shift_id = ws.shift_id
        WHERE e.employee_id = $1 AND e.organization_id = $2 AND e.is_deleted = FALSE`,
        [employeeId, organizationId]
      );

      if (empResult.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      const employee = empResult.rows[0];

      if (employee.employee_status !== 'active') {
        throw new AppError(400, 'Employee is not active');
      }

      // Check if already checked in today
      const existingAttendance = await client.query(
        `SELECT attendance_id, check_out_time 
        FROM attendance 
        WHERE employee_id = $1 AND attendance_date = CURRENT_DATE`,
        [employeeId]
      );

      if (existingAttendance.rows.length > 0) {
        const existing = existingAttendance.rows[0];
        if (!existing.check_out_time) {
          throw new AppError(400, 'Already checked in. Please check out first.');
        }
        throw new AppError(400, 'Attendance already marked for today');
      }

      // Calculate if late
      let isLate = false;
      let lateByMinutes = 0;

      if (employee.start_time) {
        const checkInTime = new Date(data.check_in_time);
        const shiftStart = new Date();
        const [hours, minutes] = employee.start_time.split(':');
        shiftStart.setHours(parseInt(hours), parseInt(minutes), 0);

        const gracePeriod = employee.grace_period_minutes || 0;
        const minutesLate = differenceInMinutes(checkInTime, shiftStart);

        if (minutesLate > gracePeriod) {
          isLate = true;
          lateByMinutes = minutesLate - gracePeriod;
        }
      }

      // Create attendance record
      const result = await client.query(
        `INSERT INTO attendance (
          organization_id, company_id, employee_id, attendance_date,
          shift_id, check_in_time, check_in_location, check_in_latitude,
          check_in_longitude, check_in_ip_address, check_in_device,
          check_in_photo_url, check_in_method, work_type,
          attendance_status, is_late, late_by_minutes
        ) VALUES (
          $1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, 'mobile', $12,
          'present', $13, $14
        ) RETURNING *`,
        [
          organizationId,
          employee.company_id,
          employeeId,
          employee.shift_id,
          data.check_in_time,
          data.location,
          data.latitude,
          data.longitude,
          data.ip_address,
          data.device,
          data.photo_url,
          data.work_type || 'office',
          isLate,
          lateByMinutes
        ]
      );

      return {
        ...result.rows[0],
        message: isLate 
          ? `Checked in successfully. You are ${lateByMinutes} minutes late.`
          : 'Checked in successfully'
      };
    });
  }

  /**
   * Check-out employee
   */
  async checkOut(employeeId: string, organizationId: string, data: any) {
    return transaction(async (client) => {
      // Get attendance record
      const result = await client.query(
        `SELECT a.*, ws.end_time, ws.early_departure_grace_minutes
        FROM attendance a
        LEFT JOIN work_shifts ws ON a.shift_id = ws.shift_id
        WHERE a.attendance_id = $1 
          AND a.employee_id = $2 
          AND a.organization_id = $3`,
        [data.attendance_id, employeeId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Attendance record not found');
      }

      const attendance = result.rows[0];

      if (attendance.check_out_time) {
        throw new AppError(400, 'Already checked out');
      }

      // Calculate hours worked
      const checkInTime = new Date(attendance.check_in_time);
      const checkOutTime = new Date(data.check_out_time);
      const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
      const totalHours = (totalMinutes / 60).toFixed(2);

      // Calculate if early departure
      let isEarlyDeparture = false;
      let earlyDepartureMinutes = 0;

      if (attendance.end_time) {
        const shiftEnd = new Date();
        const [hours, minutes] = attendance.end_time.split(':');
        shiftEnd.setHours(parseInt(hours), parseInt(minutes), 0);

        const gracePeriod = attendance.early_departure_grace_minutes || 0;
        const minutesEarly = differenceInMinutes(shiftEnd, checkOutTime);

        if (minutesEarly > gracePeriod) {
          isEarlyDeparture = true;
          earlyDepartureMinutes = minutesEarly - gracePeriod;
        }
      }

      // Update attendance
      const updateResult = await client.query(
        `UPDATE attendance 
        SET 
          check_out_time = $1,
          check_out_location = $2,
          check_out_latitude = $3,
          check_out_longitude = $4,
          check_out_method = 'mobile',
          total_hours = $5,
          net_hours = $5,
          is_early_departure = $6,
          early_departure_minutes = $7,
          notes = $8,
          modified_at = NOW()
        WHERE attendance_id = $9
        RETURNING *`,
        [
          data.check_out_time,
          data.location,
          data.latitude,
          data.longitude,
          totalHours,
          isEarlyDeparture,
          earlyDepartureMinutes,
          data.notes,
          data.attendance_id
        ]
      );

      return {
        ...updateResult.rows[0],
        message: isEarlyDeparture
          ? `Checked out successfully. Early departure by ${earlyDepartureMinutes} minutes.`
          : 'Checked out successfully'
      };
    });
  }

  /**
   * Get attendance records with filters
   */
  async getAttendance(organizationId: string, filters: any) {
    const { page, limit, offset } = getPagination(filters.page, filters.limit);
    
    let whereConditions = ['a.organization_id = $1'];
    let params: any[] = [organizationId];
    let paramCount = 1;

    // Employee filter (for managers viewing team)
    if (filters.employee_id) {
      paramCount++;
      whereConditions.push(`a.employee_id = $${paramCount}`);
      params.push(filters.employee_id);
    }

    // Department filter
    if (filters.department_id) {
      paramCount++;
      whereConditions.push(`e.department_id = $${paramCount}`);
      params.push(filters.department_id);
    }

    // Date range
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

    // Status filter
    if (filters.status) {
      paramCount++;
      whereConditions.push(`a.attendance_status = $${paramCount}`);
      params.push(filters.status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get records
    const sql = `
      SELECT 
        a.*,
        e.employee_code, e.full_name, e.email,
        d.department_name,
        ws.shift_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN work_shifts ws ON a.shift_id = ws.shift_id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC, a.check_in_time DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await query(sql, params);

    return {
      attendance: result.rows,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  /**
   * Get attendance summary for employee
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
        COUNT(*) FILTER (WHERE is_late = TRUE) as late_arrivals,
        COUNT(*) FILTER (WHERE is_early_departure = TRUE) as early_departures,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(overtime_hours), 0) as overtime_hours,
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
   * Request attendance regularization
   */
  async requestRegularization(
    employeeId: string,
    organizationId: string,
    data: any
  ) {
    return transaction(async (client) => {
      // Check if attendance exists for the date
      const attendanceResult = await client.query(
        `SELECT attendance_id, is_regularized, attendance_status
        FROM attendance
        WHERE employee_id = $1 AND attendance_date = $2`,
        [employeeId, data.attendance_date]
      );

      let attendanceId = null;

      if (attendanceResult.rows.length > 0) {
        const attendance = attendanceResult.rows[0];
        
        if (attendance.is_regularized) {
          throw new AppError(400, 'Attendance already regularized for this date');
        }

        attendanceId = attendance.attendance_id;
      }

      // Get reporting manager
      const managerResult = await client.query(
        'SELECT reporting_manager_id FROM employees WHERE employee_id = $1',
        [employeeId]
      );

      if (!managerResult.rows[0]?.reporting_manager_id) {
        throw new AppError(400, 'No reporting manager assigned');
      }

      const managerId = managerResult.rows[0].reporting_manager_id;

      // Create regularization request
      const result = await client.query(
        `INSERT INTO attendance_regularizations (
          organization_id, employee_id, attendance_id, attendance_date,
          regularization_type, requested_check_in, requested_check_out,
          reason, supporting_document_url, approver_id, status
        ) VALUES ($1, $2, $3, $4, 'wrong_time', $5, $6, $7, $8, $9, 'pending')
        RETURNING *`,
        [
          organizationId,
          employeeId,
          attendanceId,
          data.attendance_date,
          data.requested_check_in,
          data.requested_check_out,
          data.reason,
          data.supporting_document_url,
          managerId
        ]
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
          'attendance',
          'Attendance Regularization Request',
          $3,
          '/attendance/regularizations/' || $4
        )`,
        [
          organizationId,
          managerId,
          `Regularization request from ${employeeId} for ${data.attendance_date}`,
          result.rows[0].regularization_id
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Approve/Reject regularization
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

      if (regularization.approver_id !== approverId) {
        throw new AppError(403, 'Not authorized to approve this request');
      }

      // Update regularization status
      await client.query(
        `UPDATE attendance_regularizations
        SET status = $1, approved_at = NOW(), approval_comments = $2
        WHERE regularization_id = $3`,
        [action === 'approve' ? 'approved' : 'rejected', comments, regularizationId]
      );

      if (action === 'approve') {
        // Update or create attendance record
        if (regularization.attendance_id) {
          // Update existing attendance
          await client.query(
            `UPDATE attendance
            SET 
              check_in_time = $1,
              check_out_time = $2,
              is_regularized = TRUE,
              regularization_request_id = $3,
              regularized_by = $4,
              regularized_at = NOW(),
              is_manually_added = TRUE
            WHERE attendance_id = $5`,
            [
              regularization.requested_check_in,
              regularization.requested_check_out,
              regularizationId,
              approverId,
              regularization.attendance_id
            ]
          );
        } else {
          // Create new attendance record
          const employeeResult = await client.query(
            'SELECT company_id FROM employees WHERE employee_id = $1',
            [regularization.employee_id]
          );

          await client.query(
            `INSERT INTO attendance (
              organization_id, company_id, employee_id, attendance_date,
              check_in_time, check_out_time, attendance_status,
              is_regularized, regularization_request_id, regularized_by,
              regularized_at, is_manually_added, manual_entry_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, 'present', TRUE, $7, $8, NOW(), TRUE, $9)`,
            [
              organizationId,
              employeeResult.rows[0].company_id,
              regularization.employee_id,
              regularization.attendance_date,
              regularization.requested_check_in,
              regularization.requested_check_out,
              regularizationId,
              approverId,
              regularization.reason
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
        e.employee_id, e.employee_code, e.full_name, e.email,
        e.profile_picture_url,
        d.department_name,
        des.designation_name,
        a.attendance_id, a.check_in_time, a.check_out_time,
        a.attendance_status, a.work_type, a.is_late, a.total_hours,
        CASE 
          WHEN a.attendance_id IS NULL THEN 'not_marked'
          WHEN a.check_out_time IS NULL THEN 'checked_in'
          ELSE 'checked_out'
        END as current_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.attendance_date = $1
      WHERE e.reporting_manager_id = $2 
        AND e.organization_id = $3
        AND e.is_deleted = FALSE
        AND e.employee_status IN ('active', 'on_probation')
      ORDER BY a.check_in_time DESC NULLS LAST, e.full_name`,
      [targetDate, managerId, organizationId]
    );

    return result.rows;
  }
}

// ===== src/controllers/attendance.controller.ts =====
import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { successResponse } from '../utils/response';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      // Add IP and device info from request
      req.body.ip_address = req.ip;
      req.body.device = req.headers['user-agent'];
      
      const result = await attendanceService.checkIn(employeeId, organizationId, req.body);
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      const result = await attendanceService.checkOut(employeeId, organizationId, req.body);
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const filters = req.query;
      
      // If not admin, only show own attendance
      if (!filters.employee_id && !(req as any).user.permissions.includes('attendance.view_all')) {
        filters.employee_id = (req as any).user.employee_id;
      }
      
      const result = await attendanceService.getAttendance(organizationId, filters);
      return successResponse(res, result.attendance, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.employee_id || (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      
      const result = await attendanceService.getAttendanceSummary(
        employeeId,
        organizationId,
        month,
        year
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async requestRegularization(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      
      const result = await attendanceService.requestRegularization(
        employeeId,
        organizationId,
        req.body
      );
      return successResponse(res, result, 'Regularization request submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  async processRegularization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;
      const organizationId = (req as any).user.organization_id;
      const approverId = (req as any).user.employee_id;
      
      const result = await attendanceService.processRegularization(
        id,
        organizationId,
        approverId,
        action,
        comments
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getTeamAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = (req as any).user.employee_id;
      const organizationId = (req as any).user.organization_id;
      const date = req.query.date as string;
      
      const result = await attendanceService.getTeamAttendance(managerId, organizationId, date);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

// ===== src/routes/attendance.routes.ts =====
import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '../middleware/validation';
import { authorize } from '../middleware/authorize';
import {
  checkInSchema,
  checkOutSchema,
  regularizationSchema
} from '../validators/attendance.validator';

const router = Router();
const attendanceController = new AttendanceController();

// Attendance marking
router.post('/check-in', validate(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut);

// View attendance
router.get('/', authorize('attendance.view'), attendanceController.getAttendance);
router.get('/summary/:employee_id?', authorize('attendance.view'), attendanceController.getSummary);
router.get('/team', authorize('attendance.view'), attendanceController.getTeamAttendance);

// Regularization
router.post('/regularize', validate(regularizationSchema), attendanceController.requestRegularization);
router.post('/regularizations/:id/process', authorize('attendance.approve'), attendanceController.processRegularization);

export default router;

// =====================================================
// Attendance Management Module Complete
// Use this pattern for all remaining modules!
// =====================================================