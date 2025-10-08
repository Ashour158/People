import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import {
  createWorkflowDefinitionSchema,
  addApprovalLevelSchema,
  initiateWorkflowSchema,
  processApprovalSchema,
  cancelWorkflowSchema
} from '../validators/workflow.validator';

const router = Router();
const workflowController = new WorkflowController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/workflows/definitions
 * @desc    Create a new workflow definition
 * @access  Private (Admin/HR)
 */
router.post(
  '/definitions',
  validateRequest(createWorkflowDefinitionSchema),
  workflowController.createWorkflowDefinition.bind(workflowController)
);

/**
 * @route   POST /api/v1/workflows/definitions/:workflow_id/levels
 * @desc    Add approval level to workflow definition
 * @access  Private (Admin/HR)
 */
router.post(
  '/definitions/:workflow_id/levels',
  validateRequest(addApprovalLevelSchema),
  workflowController.addApprovalLevel.bind(workflowController)
);

/**
 * @route   POST /api/v1/workflows/initiate
 * @desc    Initiate a new workflow instance
 * @access  Private
 */
router.post(
  '/initiate',
  validateRequest(initiateWorkflowSchema),
  workflowController.initiateWorkflow.bind(workflowController)
);

/**
 * @route   GET /api/v1/workflows/pending-approvals
 * @desc    Get pending approvals for current user
 * @access  Private
 */
router.get(
  '/pending-approvals',
  workflowController.getPendingApprovals.bind(workflowController)
);

/**
 * @route   POST /api/v1/workflows/approvals/:step_id/process
 * @desc    Process an approval (approve/reject/delegate)
 * @access  Private
 */
router.post(
  '/approvals/:step_id/process',
  validateRequest(processApprovalSchema),
  workflowController.processApproval.bind(workflowController)
);

/**
 * @route   GET /api/v1/workflows/instances/:workflow_instance_id
 * @desc    Get workflow instance details with history
 * @access  Private
 */
router.get(
  '/instances/:workflow_instance_id',
  workflowController.getWorkflowInstance.bind(workflowController)
);

/**
 * @route   POST /api/v1/workflows/instances/:workflow_instance_id/cancel
 * @desc    Cancel a workflow instance
 * @access  Private
 */
router.post(
  '/instances/:workflow_instance_id/cancel',
  validateRequest(cancelWorkflowSchema),
  workflowController.cancelWorkflow.bind(workflowController)
);

/**
 * @route   GET /api/v1/workflows/statistics
 * @desc    Get workflow statistics
 * @access  Private (Admin/HR/Manager)
 */
router.get(
  '/statistics',
  workflowController.getWorkflowStatistics.bind(workflowController)
);

export default router;
