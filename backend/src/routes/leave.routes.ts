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

router.get('/types', leaveController.getLeaveTypes.bind(leaveController));
router.post('/apply', validate(applyLeaveSchema), leaveController.applyLeave.bind(leaveController));
router.get('/', leaveController.getLeaveApplications.bind(leaveController));
router.post(
  '/:id/action',
  authorize(['leave.approve']),
  validate(approveRejectLeaveSchema),
  leaveController.approveRejectLeave.bind(leaveController)
);
router.get('/balance/:employeeId?', leaveController.getLeaveBalance.bind(leaveController));

export default router;
