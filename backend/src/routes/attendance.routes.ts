import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import {
  checkInSchema,
  checkOutSchema,
  regularizationSchema
} from '../validators/attendance.validator';

const router = Router();
const attendanceController = new AttendanceController();

// All routes require authentication
router.use(authenticate);

router.post('/check-in', validate(checkInSchema), attendanceController.checkIn.bind(attendanceController));
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut.bind(attendanceController));
router.get('/', attendanceController.getAttendance.bind(attendanceController));
router.post('/regularization', validate(regularizationSchema), attendanceController.requestRegularization.bind(attendanceController));

export default router;
