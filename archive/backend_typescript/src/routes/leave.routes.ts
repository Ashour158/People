import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  applyLeaveSchema,
  approveRejectLeaveSchema,
  cancelLeaveSchema
} from '../validators/leave.validator';

const router = Router();
const leaveController = new LeaveController();

// All routes require authentication
router.use(authenticate);

// Leave types
router.get('/types', leaveController.getLeaveTypes);

// Leave applications
router.post('/apply', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/', leaveController.getLeaveApplications);

// My leave history
router.get('/my-history', leaveController.getMyLeaveHistory);

// Leave balance
router.get('/balance/:employeeId?', leaveController.getLeaveBalance);

// Leave summary/statistics
router.get('/summary', leaveController.getLeaveSummary);

// Check eligibility
router.get('/check-eligibility', leaveController.checkLeaveEligibility);

// Approve/Reject leave
router.post(
  '/:id/action',
  authorize(['leave.approve']),
  validate(approveRejectLeaveSchema),
  leaveController.approveRejectLeave
);

// Cancel leave
router.post(
  '/:id/cancel',
  validate(cancelLeaveSchema),
  leaveController.cancelLeave
);

// Pending approvals (for managers)
router.get(
  '/pending-approvals',
  authorize(['leave.approve']),
  leaveController.getPendingApprovals
);

// Team leaves (for managers)
router.get(
  '/team',
  authorize(['leave.view_team']),
  leaveController.getTeamLeaves
);

// Leave calendar
router.get(
  '/calendar',
  authorize(['leave.view_calendar']),
  leaveController.getLeaveCalendar
);

// Leave statistics
router.get(
  '/stats',
  authorize(['leave.view_stats']),
  leaveController.getLeaveStats
);

export default router;
