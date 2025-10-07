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

router.post('/check-in', validate(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut);
router.get('/', attendanceController.getAttendance);
router.post('/regularization', validate(regularizationSchema), attendanceController.requestRegularization);

export default router;
