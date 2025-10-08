import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const leaveService = new LeaveService();

export class LeaveController {
  async getLeaveTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const companyId = req.query.company_id as string;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await leaveService.getLeaveTypes(organizationId, companyId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await leaveService.applyLeave(employeeId, organizationId, req.body as Record<string, unknown>);
      successResponse(res, result, 'Leave application submitted', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const filters = req.query as Record<string, unknown>;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // If not admin, only show own leaves
      if (!filters.employee_id && !(req as AuthRequest).user?.permissions.includes('leave.view_all')) {
        filters.employee_id = (req as AuthRequest).user?.employee_id;
      }
      
      const result = await leaveService.getLeaveApplications(organizationId, filters);
      successResponse(res, result.leaves, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async approveRejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      const { id } = req.params;
      const bodyData = req.body as Record<string, unknown>;
      const { action, ...data } = bodyData;
      
      if (!organizationId || !approverId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      if (!id) {
        res.status(400).json({ success: false, error: 'Leave ID is required' });
        return;
      }
      
      const result = await leaveService.approveRejectLeave(
        id,
        organizationId,
        approverId,
        action as 'approve' | 'reject',
        data as Record<string, unknown>
      );
      successResponse(res, result, `Leave ${action as string}d successfully`);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const employeeId = req.params.employeeId || (req as AuthRequest).user?.employee_id;
      
      if (!organizationId || !employeeId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await leaveService.getLeaveBalance(employeeId, organizationId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
