import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== ONBOARDING PROGRAMS ====================

router.post(
  '/programs',
  authorize(['onboarding.manage']),
  onboardingController.createProgram
);

router.get(
  '/programs',
  authorize(['onboarding.view']),
  onboardingController.getPrograms
);

router.get(
  '/programs/:id',
  authorize(['onboarding.view']),
  onboardingController.getProgramById
);

router.put(
  '/programs/:id',
  authorize(['onboarding.manage']),
  onboardingController.updateProgram
);

// ==================== ONBOARDING TASKS ====================

router.post(
  '/tasks',
  authorize(['onboarding.manage']),
  onboardingController.createTask
);

router.get(
  '/programs/:program_id/tasks',
  authorize(['onboarding.view']),
  onboardingController.getProgramTasks
);

// ==================== EMPLOYEE ONBOARDING ====================

router.post(
  '/start',
  authorize(['onboarding.manage']),
  onboardingController.startOnboarding
);

router.get(
  '/employees/:employee_id',
  authorize(['onboarding.view']),
  onboardingController.getEmployeeOnboarding
);

router.post(
  '/tasks/:progress_id/complete',
  authorize(['onboarding.update']),
  onboardingController.completeTask
);

router.get(
  '/employees/:employee_id/pending',
  authorize(['onboarding.view']),
  onboardingController.getPendingTasks
);

router.get(
  '/statistics',
  authorize(['onboarding.view']),
  onboardingController.getStatistics
);

export default router;
