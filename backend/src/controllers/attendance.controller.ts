import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.checkIn(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Checked in successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.checkOut(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Checked out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAttendance(req: Request, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async requestRegularization(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await attendanceService.requestRegularization(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Regularization request submitted', undefined, 201);
    } catch (error) {
      next(error);
    }
  }
}
