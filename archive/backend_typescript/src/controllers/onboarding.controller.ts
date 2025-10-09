import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { pool } from '../config/database';

const onboardingService = new OnboardingService(pool);

export class OnboardingController {
  // ==================== ONBOARDING PROGRAMS ====================

  async createProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const program = await onboardingService.createOnboardingProgram({
        ...req.body,
        organization_id,
        created_by: user_id,
      });

      res.status(201).json({
        success: true,
        message: 'Onboarding program created successfully',
        data: program,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPrograms(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { is_active } = req.query;

      const filters: any = {};
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }

      const programs = await onboardingService.getOnboardingPrograms(organization_id, filters);

      res.json({
        success: true,
        data: programs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgramById(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { id } = req.params;

      const program = await onboardingService.getOnboardingProgramById(id, organization_id);

      res.json({
        success: true,
        data: program,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { id } = req.params;

      const program = await onboardingService.updateOnboardingProgram(
        id,
        organization_id,
        req.body
      );

      res.json({
        success: true,
        message: 'Onboarding program updated successfully',
        data: program,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ONBOARDING TASKS ====================

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const task = await onboardingService.createOnboardingTask({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Onboarding task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgramTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { program_id } = req.params;

      const tasks = await onboardingService.getTasksForProgram(program_id);

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== EMPLOYEE ONBOARDING ====================

  async startOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const onboarding = await onboardingService.startEmployeeOnboarding({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Employee onboarding started successfully',
        data: onboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;

      const onboarding = await onboardingService.getEmployeeOnboarding(
        employee_id,
        organization_id
      );

      res.json({
        success: true,
        data: onboarding,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.user!;
      const { progress_id } = req.params;
      const { employee_id, notes } = req.body;

      const taskProgress = await onboardingService.completeOnboardingTask(
        progress_id,
        employee_id,
        user_id,
        notes
      );

      res.json({
        success: true,
        message: 'Onboarding task completed successfully',
        data: taskProgress,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { employee_id } = req.params;

      const tasks = await onboardingService.getPendingTasks(employee_id);

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const stats = await onboardingService.getOnboardingStatistics(organization_id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController();
