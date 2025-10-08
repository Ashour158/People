import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  checkInSchema,
  checkOutSchema,
  regularizationSchema
} from '../validators/attendance.validator';

const router = Router();
const attendanceController = new AttendanceController();

// All routes require authentication
router.use(authenticate);

// Check-in and check-out
router.post('/check-in', validate(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut);

// Get attendance records
router.get('/', attendanceController.getAttendance);

// Get my attendance history
router.get('/my-history', attendanceController.getMyAttendanceHistory);

// Get attendance summary
router.get('/summary', attendanceController.getAttendanceSummary);

// Regularization
router.post(
  '/regularization',
  validate(regularizationSchema),
  attendanceController.requestRegularization
);

router.get(
  '/regularization/pending',
  authorize(['attendance.approve']),
  attendanceController.getPendingRegularizations
);

router.post(
  '/regularization/:id/process',
  authorize(['attendance.approve']),
  attendanceController.processRegularization
);

// Team attendance (for managers)
router.get(
  '/team',
  authorize(['attendance.view_team']),
  attendanceController.getTeamAttendance
);

// Attendance statistics
router.get(
  '/stats/overview',
  authorize(['attendance.view_stats']),
  attendanceController.getAttendanceStats
);

// Bulk mark attendance (HR/Admin)
router.post(
  '/bulk-mark',
  authorize(['attendance.bulk_mark']),
  attendanceController.bulkMarkAttendance
);

export default router;
