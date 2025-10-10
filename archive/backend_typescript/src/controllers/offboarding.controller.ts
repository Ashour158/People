import { Request, Response, NextFunction } from 'express';
import { OffboardingService } from '../services/offboarding.service';
import { pool } from '../config/database';

const offboardingService = new OffboardingService(pool);

export class OffboardingController {
  // ==================== OFFBOARDING CHECKLISTS ====================

  async createChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const checklist = await offboardingService.createOffboardingChecklist({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Offboarding checklist created successfully',
        data: checklist,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChecklists(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const checklists = await offboardingService.getOffboardingChecklists(organization_id);

      res.json({
        success: true,
        data: checklists,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== OFFBOARDING TASKS ====================

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await offboardingService.createOffboardingTask(req.body);

      res.status(201).json({
        success: true,
        message: 'Offboarding task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChecklistTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { checklist_id } = req.params;

      const tasks = await offboardingService.getTasksForChecklist(checklist_id);

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== EMPLOYEE OFFBOARDING ====================

  async initiateOffboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const offboarding = await offboardingService.initiateOffboarding({
        ...req.body,
        organization_id,
        created_by: user_id,
      });

      res.status(201).json({
        success: true,
        message: 'Employee offboarding initiated successfully',
        data: offboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeOffboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;

      const offboarding = await offboardingService.getEmployeeOffboarding(
        employee_id,
        organization_id
      );

      res.json({
        success: true,
        data: offboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.user!;
      const { progress_id } = req.params;
      const { notes } = req.body;

      const taskProgress = await offboardingService.completeOffboardingTask(
        progress_id,
        user_id,
        notes
      );

      res.json({
        success: true,
        message: 'Offboarding task completed successfully',
        data: taskProgress,
      });
    } catch (error) {
      next(error);
    }
  }

  async conductExitInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { offboarding_id } = req.params;

      const offboarding = await offboardingService.conductExitInterview(
        offboarding_id,
        organization_id,
        req.body
      );

      res.json({
        success: true,
        message: 'Exit interview recorded successfully',
        data: offboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async processFinalSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { offboarding_id } = req.params;

      const offboarding = await offboardingService.processFinalSettlement(
        offboarding_id,
        organization_id,
        req.body
      );

      res.json({
        success: true,
        message: 'Final settlement processed successfully',
        data: offboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const stats = await offboardingService.getOffboardingStatistics(organization_id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingClearances(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const clearances = await offboardingService.getPendingClearances(organization_id);

      res.json({
        success: true,
        data: clearances,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const offboardingController = new OffboardingController();
