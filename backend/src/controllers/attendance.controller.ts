import { getRequiredParam } from '../utils/request';
import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.checkIn(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Checked in successfully', undefined, 201);
    } catch (error) {
      return next(error);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.checkOut(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Checked out successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getAttendance(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const filters = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      // If not admin, only show own attendance
      if (!filters.employee_id && !(req as AuthRequest).user?.permissions.includes('attendance.view_all')) {
        filters.employee_id = (req as AuthRequest).user?.employee_id;
      }
      
      const result = await attendanceService.getAttendance(organizationId, filters);
      return successResponse(res, result.attendance, undefined, result.meta);
    } catch (error) {
      return next(error);
    }
  }

  async requestRegularization(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.requestRegularization(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Regularization request submitted', undefined, 201);
    } catch (error) {
      return next(error);
    }
  }

  async getAttendanceSummary(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      const { month, year } = req.query;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.getAttendanceSummary(
        employeeId,
        organizationId,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async processRegularization(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      const id = getRequiredParam(req, 'id');
      const { action, comments } = req.body;
      
      if (!organizationId || !approverId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.processRegularization(
        id,
        organizationId,
        approverId,
        action,
        comments
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getTeamAttendance(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const managerId = (req as AuthRequest).user?.employee_id;
      const { date } = req.query;
      
      if (!organizationId || !managerId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.getTeamAttendance(
        managerId,
        organizationId,
        date as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getPendingRegularizations(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.getPendingRegularizations(
        organizationId,
        approverId
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getAttendanceStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { date } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.getAttendanceStats(
        organizationId,
        date as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async bulkMarkAttendance(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { attendance_records } = req.body;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      if (!Array.isArray(attendance_records) || attendance_records.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'attendance_records must be a non-empty array' 
        });
      }
      
      const result = await attendanceService.bulkMarkAttendance(
        organizationId,
        attendance_records
      );
      return successResponse(res, result, 'Attendance marked successfully', undefined, 201);
    } catch (error) {
      return next(error);
    }
  }

  async getMyAttendanceHistory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.getMyAttendanceHistory(
        employeeId,
        organizationId,
        req.query
      );
      return successResponse(res, result.attendance, undefined, result.meta);
    } catch (error) {
      return next(error);
    }
  }
}
