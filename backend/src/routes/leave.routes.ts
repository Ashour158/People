import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  applyLeaveSchema,
  approveRejectLeaveSchema
} from '../validators/leave.validator';

const router = Router();
const leaveController = new LeaveController();

// All routes require authentication
router.use(authenticate);

router.get('/types', leaveController.getLeaveTypes);
router.post('/apply', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/', leaveController.getLeaveApplications);
router.post(
  '/:id/action',
  authorize(['leave.approve']),
  validate(approveRejectLeaveSchema),
  leaveController.approveRejectLeave
);
router.get('/balance/:employeeId?', leaveController.getLeaveBalance);

export default router;
