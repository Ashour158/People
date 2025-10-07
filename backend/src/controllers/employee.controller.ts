import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const employeeService = new EmployeeService();

export class EmployeeController {
  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.createEmployee(organizationId, req.body);
      return successResponse(res, result, 'Employee created successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async getEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployees(organizationId, req.query);
      return successResponse(res, result.employees, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeById(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.updateEmployee(organizationId, id, req.body);
      return successResponse(res, result, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.deleteEmployee(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
