import { Request, Response, NextFunction } from 'express';
import { PayrollService } from '../services/payroll.service';
import { AuthRequest } from '../types';

const payrollService = new PayrollService();

export class PayrollController {
  async createComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.createComponent(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getComponents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getComponents(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getComponentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getComponentById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.updateComponent(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      await payrollService.deleteComponent(organizationId, req.params.id);
      res.json({ success: true, message: 'Component deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createEmployeeCompensation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.createEmployeeCompensation(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeCompensation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getEmployeeCompensation(organizationId, req.params.employeeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateEmployeeCompensation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.updateEmployeeCompensation(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.createPayrollRun(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPayrollRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getPayrollRuns(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPayrollRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getPayrollRunById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async processPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.processPayrollRun(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, data: result, message: 'Payroll run processing started' });
    } catch (error) {
      next(error);
    }
  }

  async finalizePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.finalizePayrollRun(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, data: result, message: 'Payroll run finalized successfully' });
    } catch (error) {
      next(error);
    }
  }

  async regeneratePayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      await payrollService.regeneratePayslips(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, message: 'Payslips regenerated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getPayslips(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPayslipById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const organizationId = authReq.user.organization_id;
      const result = await payrollService.getPayslipById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
