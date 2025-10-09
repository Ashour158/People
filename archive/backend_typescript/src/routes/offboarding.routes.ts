import { Router } from 'express';
import { offboardingController } from '../controllers/offboarding.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== OFFBOARDING CHECKLISTS ====================

router.post(
  '/checklists',
  authorize(['offboarding.manage']),
  offboardingController.createChecklist
);

router.get(
  '/checklists',
  authorize(['offboarding.view']),
  offboardingController.getChecklists
);

// ==================== OFFBOARDING TASKS ====================

router.post(
  '/tasks',
  authorize(['offboarding.manage']),
  offboardingController.createTask
);

router.get(
  '/checklists/:checklist_id/tasks',
  authorize(['offboarding.view']),
  offboardingController.getChecklistTasks
);

// ==================== EMPLOYEE OFFBOARDING ====================

router.post(
  '/initiate',
  authorize(['offboarding.manage']),
  offboardingController.initiateOffboarding
);

router.get(
  '/employees/:employee_id',
  authorize(['offboarding.view']),
  offboardingController.getEmployeeOffboarding
);

router.post(
  '/tasks/:progress_id/complete',
  authorize(['offboarding.update']),
  offboardingController.completeTask
);

router.post(
  '/:offboarding_id/exit-interview',
  authorize(['offboarding.manage']),
  offboardingController.conductExitInterview
);

router.post(
  '/:offboarding_id/final-settlement',
  authorize(['offboarding.manage']),
  offboardingController.processFinalSettlement
);

router.get(
  '/statistics',
  authorize(['offboarding.view']),
  offboardingController.getStatistics
);

router.get(
  '/pending-clearances',
  authorize(['offboarding.view']),
  offboardingController.getPendingClearances
);

export default router;
