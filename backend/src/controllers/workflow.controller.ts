import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types';

const workflowService = new WorkflowService();

export class WorkflowController {
  /**
   * Create workflow definition
   */
  async createWorkflowDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const userId = (req as AuthRequest).user?.user_id;

      if (!organizationId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.createWorkflowDefinition(
        organizationId,
        req.body,
        userId
      );

      return successResponse(res, result, 'Workflow definition created successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add approval level to workflow
   */
  async addApprovalLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { workflow_id } = req.params;

      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.addApprovalLevel(
        workflow_id,
        organizationId,
        req.body
      );

      return successResponse(res, result, 'Approval level added successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate workflow for an entity
   */
  async initiateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;

      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.initiateWorkflow(organizationId, req.body);

      return successResponse(res, result, 'Workflow initiated successfully', undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending approvals for logged-in user
   */
  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;

      if (!organizationId || !approverId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.getPendingApprovals(
        approverId,
        organizationId,
        req.query
      );

      return successResponse(res, result.approvals, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process approval action (approve/reject/delegate)
   */
  async processApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const approverId = (req as AuthRequest).user?.employee_id;
      const { step_id } = req.params;

      if (!organizationId || !approverId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.processApprovalAction(
        step_id,
        approverId,
        organizationId,
        req.body
      );

      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get workflow instance details
   */
  async getWorkflowInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const { workflow_instance_id } = req.params;

      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.getWorkflowInstance(
        workflow_instance_id,
        organizationId
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;
      const userId = (req as AuthRequest).user?.user_id;
      const { workflow_instance_id } = req.params;
      const { cancellation_reason } = req.body;

      if (!organizationId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.cancelWorkflow(
        workflow_instance_id,
        organizationId,
        userId,
        cancellation_reason
      );

      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as AuthRequest).user?.organization_id;

      if (!organizationId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await workflowService.getWorkflowStatistics(
        organizationId,
        req.query
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
