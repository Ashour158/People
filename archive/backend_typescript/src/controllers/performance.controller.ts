import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from '../services/performance.service';
import { pool } from '../config/database';

const performanceService = new PerformanceService(pool);

export class PerformanceController {
  // ==================== PERFORMANCE CYCLES ====================

  async createCycle(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const cycle = await performanceService.createPerformanceCycle({
        ...req.body,
        organization_id,
        created_by: user_id,
      });

      res.status(201).json({
        success: true,
        message: 'Performance cycle created successfully',
        data: cycle,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCycles(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { status } = req.query;

      const filters: any = {};
      if (status) {
        filters.status = status as string;
      }

      const cycles = await performanceService.getPerformanceCycles(organization_id, filters);

      res.json({
        success: true,
        data: cycles,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GOALS (OKR/KPI) ====================

  async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const goal = await performanceService.createGoal({
        ...req.body,
        organization_id,
        created_by: user_id,
      });

      res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;
      const { cycle_id, status } = req.query;

      const filters: any = {};
      if (cycle_id) filters.cycle_id = cycle_id as string;
      if (status) filters.status = status as string;

      const goals = await performanceService.getEmployeeGoals(
        employee_id,
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: goals,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGoalProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { goal_id } = req.params;
      const { employee_id } = req.body;

      const goal = await performanceService.updateGoalProgress(goal_id, employee_id, req.body);

      res.json({
        success: true,
        message: 'Goal progress updated successfully',
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== PERFORMANCE REVIEWS ====================

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const review = await performanceService.createPerformanceReview({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Performance review created successfully',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.user!;
      const { review_id } = req.params;

      const review = await performanceService.submitPerformanceReview(
        review_id,
        user_id,
        req.body
      );

      res.json({
        success: true,
        message: 'Performance review submitted successfully',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;
      const { cycle_id, review_type } = req.query;

      const filters: any = {};
      if (cycle_id) filters.cycle_id = cycle_id as string;
      if (review_type) filters.review_type = review_type as string;

      const reviews = await performanceService.getEmployeeReviews(
        employee_id,
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== FEEDBACK (360) ====================

  async provideFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const feedback = await performanceService.provideFeedback({
        ...req.body,
        feedback_from_employee_id: req.body.is_anonymous ? undefined : user_id,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Feedback provided successfully',
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;
      const { feedback_type, visibility } = req.query;

      const filters: any = {};
      if (feedback_type) filters.feedback_type = feedback_type as string;
      if (visibility) filters.visibility = visibility as string;

      const feedback = await performanceService.getEmployeeFeedback(
        employee_id,
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COMPETENCY MAPPING ====================

  async assessCompetency(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;

      const competency = await performanceService.assessCompetency({
        ...req.body,
        assessed_by: user_id,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Competency assessed successfully',
        data: competency,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeCompetencies(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;

      const competencies = await performanceService.getEmployeeCompetencies(
        employee_id,
        organization_id
      );

      res.json({
        success: true,
        data: competencies,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { cycle_id, department_id } = req.query;

      const filters: any = {};
      if (cycle_id) filters.cycle_id = cycle_id as string;
      if (department_id) filters.department_id = department_id as string;

      const analytics = await performanceService.getPerformanceAnalytics(
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopPerformers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { cycle_id } = req.query;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!cycle_id) {
        return res.status(400).json({
          success: false,
          message: 'cycle_id is required',
        });
      }

      const topPerformers = await performanceService.getTopPerformers(
        organization_id,
        cycle_id as string,
        limit
      );

      res.json({
        success: true,
        data: topPerformers,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const performanceController = new PerformanceController();
