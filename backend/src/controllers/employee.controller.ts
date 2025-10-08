import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { successResponse } from '../utils/response';
import { getRequiredParam, getOptionalQuery } from '../utils/request';
import { AuthRequest } from '../types';

const employeeService = new EmployeeService();

export class EmployeeController {
  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.createEmployee(organizationId, req.body);
      return successResponse(res, result, 'Employee created successfully', undefined, 201);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployees(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployees(organizationId, req.query);
      return successResponse(res, result.employees, undefined, result.meta);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeById(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.updateEmployee(organizationId, id, req.body);
      return successResponse(res, result, 'Employee updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.deleteEmployee(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async terminateEmployee(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.terminateEmployee(organizationId, id, req.body);
      return successResponse(res, result, 'Employee terminated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeTeam(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeTeam(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const company_id = getOptionalQuery(req, 'company_id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeStats(organizationId, company_id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async activateEmployee(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const id = getRequiredParam(req, 'id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.activateEmployee(organizationId, id);
      return successResponse(res, result, 'Employee activated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeesByDepartment(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const company_id = getOptionalQuery(req, 'company_id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeesByDepartment(organizationId, company_id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getNewJoiners(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const company_id = getOptionalQuery(req, 'company_id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getNewJoiners(organizationId, company_id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeesOnProbation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const company_id = getOptionalQuery(req, 'company_id');
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeesOnProbation(organizationId, company_id);
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async searchEmployees(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { q, limit } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query required' });
      }
      
      const result = await employeeService.searchEmployees(
        organizationId, 
        q as string,
        limit ? parseInt(limit as string) : 10
      );
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
