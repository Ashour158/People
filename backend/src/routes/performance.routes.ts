import { Router } from 'express';
import { performanceController } from '../controllers/performance.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== PERFORMANCE CYCLES ====================

router.post(
  '/cycles',
  authorize(['performance.manage']),
  performanceController.createCycle
);

router.get(
  '/cycles',
  authorize(['performance.view']),
  performanceController.getCycles
);

// ==================== GOALS (OKR/KPI) ====================

router.post(
  '/goals',
  authorize(['performance.create']),
  performanceController.createGoal
);

router.get(
  '/employees/:employee_id/goals',
  authorize(['performance.view']),
  performanceController.getEmployeeGoals
);

router.put(
  '/goals/:goal_id/progress',
  authorize(['performance.update']),
  performanceController.updateGoalProgress
);

// ==================== PERFORMANCE REVIEWS ====================

router.post(
  '/reviews',
  authorize(['performance.review']),
  performanceController.createReview
);

router.post(
  '/reviews/:review_id/submit',
  authorize(['performance.review']),
  performanceController.submitReview
);

router.get(
  '/employees/:employee_id/reviews',
  authorize(['performance.view']),
  performanceController.getEmployeeReviews
);

// ==================== FEEDBACK (360) ====================

router.post(
  '/feedback',
  authorize(['performance.feedback']),
  performanceController.provideFeedback
);

router.get(
  '/employees/:employee_id/feedback',
  authorize(['performance.view']),
  performanceController.getEmployeeFeedback
);

// ==================== COMPETENCY MAPPING ====================

router.post(
  '/competencies/assess',
  authorize(['performance.assess']),
  performanceController.assessCompetency
);

router.get(
  '/employees/:employee_id/competencies',
  authorize(['performance.view']),
  performanceController.getEmployeeCompetencies
);

// ==================== ANALYTICS ====================

router.get(
  '/analytics',
  authorize(['performance.view']),
  performanceController.getAnalytics
);

router.get(
  '/analytics/top-performers',
  authorize(['performance.view']),
  performanceController.getTopPerformers
);

export default router;
