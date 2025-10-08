import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from '../services/performance.service';
import { AuthRequest } from '../types';

const performanceService = new PerformanceService();

export class PerformanceController {
  async createCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.createCycle(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCycles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getCycles(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getCycleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getCycleById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.updateCycle(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      await performanceService.deleteCycle(organizationId, req.params.id);
      res.json({ success: true, message: 'Performance cycle deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.createGoal(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getGoals(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getGoalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getGoalById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.updateGoal(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      await performanceService.deleteGoal(organizationId, req.params.id);
      res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async updateGoalProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.updateGoalProgress(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.createReview(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getReviews(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getReviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getReviewById(organizationId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.updateReview(organizationId, req.params.id, authReq.user.user_id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.submitReview(organizationId, req.params.id, authReq.user.user_id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.createFeedback(organizationId, authReq.user.user_id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user.organization_id;
      const result = await performanceService.getFeedback(organizationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
