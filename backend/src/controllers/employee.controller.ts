import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';
import * as fastcsv from 'fast-csv';
import { Readable } from 'stream';
import { bulkImportEmployeeSchema } from '../validators/employee.validator';

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

  async terminateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.terminateEmployee(organizationId, id, req.body);
      return successResponse(res, result, 'Employee terminated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeTeam(organizationId, id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { company_id } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeeStats(
        organizationId, 
        company_id as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async activateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { id } = req.params;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.activateEmployee(organizationId, id);
      return successResponse(res, result, 'Employee activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEmployeesByDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { company_id } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeesByDepartment(
        organizationId, 
        company_id as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getNewJoiners(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { company_id } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getNewJoiners(
        organizationId, 
        company_id as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeesOnProbation(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { company_id } = req.query;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const result = await employeeService.getEmployeesOnProbation(
        organizationId, 
        company_id as string | undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async searchEmployees(req: Request, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async bulkImportEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const companyId = (req as AuthRequest).user?.company_id;
      
      if (!organizationId || !companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'CSV file is required' });
      }

      // Parse CSV file
      const employees: any[] = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(fastcsv.parse({ headers: true, trim: true }))
          .on('data', (row: any) => {
            employees.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (employees.length === 0) {
        return res.status(400).json({ success: false, error: 'CSV file is empty' });
      }

      // Validate each employee record
      const validatedEmployees: any[] = [];
      const validationErrors: any[] = [];

      for (let i = 0; i < employees.length; i++) {
        const { error, value } = bulkImportEmployeeSchema.validate(employees[i]);
        if (error) {
          validationErrors.push({
            row: i + 2, // +2 because row 1 is header and we start from 0
            email: employees[i].email || 'N/A',
            errors: error.details.map(d => d.message)
          });
        } else {
          validatedEmployees.push(value);
        }
      }

      // If all records have validation errors, return error
      if (validatedEmployees.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'All records have validation errors',
          validationErrors
        });
      }

      // Import validated employees
      const result = await employeeService.bulkImportEmployees(
        organizationId,
        companyId,
        validatedEmployees
      );

      // Merge validation errors with import errors
      result.errors = [...validationErrors, ...result.errors];
      result.failed = validationErrors.length + result.failed;

      return res.status(201).json({
        success: true,
        message: `Imported ${result.success} employees successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async exportEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const csv = await employeeService.exportEmployees(organizationId, req.query);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=employees-${Date.now()}.csv`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  async downloadImportTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await employeeService.getImportTemplate();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.csv');
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}
