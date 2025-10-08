import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const leaveService = new LeaveService();

export class LeaveController {
  async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const companyId = req.query.company_id as string;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getLeaveTypes(organizationId, companyId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async applyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.applyLeave(employeeId, organizationId, req.body);
      return successResponse(res, result, 'Leave application submitted', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const filters = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      // If not admin, only show own leaves
      if (!filters.employee_id && !(req as AuthRequest).user?.permissions.includes('leave.view_all')) {
        filters.employee_id = (req as AuthRequest).user?.employee_id;
      }
      
      const result = await leaveService.getLeaveApplications(organizationId, filters);
      return successResponse(res, result.leaves, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async approveRejectLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      const { id } = req.params;
      const { action, ...data } = req.body;
      
      if (!organizationId || !approverId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.approveRejectLeave(
        id,
        organizationId,
        approverId,
        action,
        data
      );
      return successResponse(res, result, `Leave ${action}d successfully`);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = req.params.employeeId || (req as AuthRequest).user?.employee_id;
      const { year } = req.query;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getLeaveBalance(
        employeeId, 
        organizationId,
        year ? parseInt(year as string) : undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async cancelLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      const { id } = req.params;
      const { cancellation_reason } = req.body;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.cancelLeave(
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
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !approverId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getPendingApprovals(approverId, organizationId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getTeamLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const managerId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !managerId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getTeamLeaves(managerId, organizationId, req.query);
      return successResponse(res, result.leaves, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      const { year } = req.query;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getLeaveSummary(
        employeeId,
        organizationId,
        year ? parseInt(year as string) : undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getLeaveCalendar(organizationId, req.query);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { year } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getLeaveStats(
        organizationId,
        year ? parseInt(year as string) : undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMyLeaveHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await leaveService.getMyLeaveHistory(
        employeeId,
        organizationId,
        req.query
      );
      return successResponse(res, result.leaves, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async checkLeaveEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      const { leave_type_id, from_date, to_date } = req.query;
      
      if (!organizationId || !employeeId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      if (!leave_type_id || !from_date || !to_date) {
        return res.status(400).json({ 
          success: false, 
          error: 'leave_type_id, from_date and to_date are required' 
        });
      }
      
      const result = await leaveService.checkLeaveEligibility(
        employeeId,
        organizationId,
        leave_type_id as string,
        new Date(from_date as string),
        new Date(to_date as string)
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
