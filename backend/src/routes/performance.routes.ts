import { Router } from 'express';
import { PerformanceController } from '../controllers/performance.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { performanceValidators } from '../validators/performance.validator';

const router = Router();
const controller = new PerformanceController();

// Apply authentication to all routes
router.use(authenticate);

// Performance Cycles
router.post('/cycles', validateRequest(performanceValidators.createCycle), controller.createCycle);
router.get('/cycles', controller.getCycles);
router.get('/cycles/:id', controller.getCycleById);
router.put('/cycles/:id', validateRequest(performanceValidators.updateCycle), controller.updateCycle);
router.delete('/cycles/:id', controller.deleteCycle);

// Goals
router.post('/goals', validateRequest(performanceValidators.createGoal), controller.createGoal);
router.get('/goals', controller.getGoals);
router.get('/goals/:id', controller.getGoalById);
router.put('/goals/:id', validateRequest(performanceValidators.updateGoal), controller.updateGoal);
router.delete('/goals/:id', controller.deleteGoal);
router.post('/goals/:id/progress', validateRequest(performanceValidators.updateProgress), controller.updateGoalProgress);

// Reviews
router.post('/reviews', validateRequest(performanceValidators.createReview), controller.createReview);
router.get('/reviews', controller.getReviews);
router.get('/reviews/:id', controller.getReviewById);
router.put('/reviews/:id', validateRequest(performanceValidators.updateReview), controller.updateReview);
router.post('/reviews/:id/submit', controller.submitReview);

// Feedback
router.post('/feedback', validateRequest(performanceValidators.createFeedback), controller.createFeedback);
router.get('/feedback', controller.getFeedback);

export default router;
