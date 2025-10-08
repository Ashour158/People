import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const employeeService = new EmployeeService();

export class EmployeeController {
  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await employeeService.createEmployee(organizationId, req.body as Record<string, unknown>);
      successResponse(res, result, 'Employee created successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  async getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const result = await employeeService.getEmployees(organizationId, req.query as Record<string, unknown>);
      successResponse(res, result.employees, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      if (!id) {
        res.status(400).json({ success: false, error: 'Employee ID is required' });
        return;
      }
      
      const result = await employeeService.getEmployeeById(organizationId, id);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      if (!id) {
        res.status(400).json({ success: false, error: 'Employee ID is required' });
        return;
      }
      
      const result = await employeeService.updateEmployee(organizationId, id, req.body as Record<string, unknown>);
      successResponse(res, result, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      if (!id) {
        res.status(400).json({ success: false, error: 'Employee ID is required' });
        return;
      }
      
      const result = await employeeService.deleteEmployee(organizationId, id);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
