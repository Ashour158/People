// =====================================================
// Services Index - Export all application services
// =====================================================

export { emailService, EmailService } from './email.service';
export { 
  NotificationService, 
  createNotificationService,
  type NotificationPayload,
  type NotificationRecord 
} from './notification.service';
export { uploadService, UploadService, FILE_TYPES, MAX_FILE_SIZE } from './upload.service';
export { cacheService, CacheService, CacheKeys } from './cache.service';

// Re-export domain services
export { AuthService } from './auth.service';
export { EmployeeService } from './employee.service';
export { AttendanceService } from './attendance.service';
export { LeaveService } from './leave.service';
export { AuditService } from './AuditService';
export { PayrollRunService } from './PayrollRunService';
