import { Router } from 'express';
import { complianceController } from '../controllers/compliance.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== AUDIT LOGS ====================

router.get(
  '/audit-logs',
  authorize(['compliance.view']),
  complianceController.getAuditLogs
);

router.get(
  '/audit-logs/:entity_type/:entity_id',
  authorize(['compliance.view']),
  complianceController.getAuditTrail
);

// ==================== COMPLIANCE DOCUMENTS ====================

router.post(
  '/documents',
  authorize(['compliance.manage']),
  complianceController.createDocument
);

router.post(
  '/documents/:document_id/verify',
  authorize(['compliance.verify']),
  complianceController.verifyDocument
);

router.get(
  '/documents/employee/:employee_id',
  authorize(['compliance.view']),
  complianceController.getEmployeeDocuments
);

router.get(
  '/documents/expiring',
  authorize(['compliance.view']),
  complianceController.getExpiringDocuments
);

// ==================== DATA RETENTION POLICIES ====================

router.post(
  '/retention-policies',
  authorize(['compliance.manage']),
  complianceController.createRetentionPolicy
);

router.get(
  '/retention-policies',
  authorize(['compliance.view']),
  complianceController.getRetentionPolicies
);

router.post(
  '/retention-policies/apply',
  authorize(['compliance.manage']),
  complianceController.applyRetentionPolicies
);

// ==================== GDPR COMPLIANCE ====================

router.post(
  '/gdpr/consent',
  authorize(['compliance.manage']),
  complianceController.recordConsent
);

router.post(
  '/gdpr/consent/withdraw',
  authorize(['compliance.manage']),
  complianceController.withdrawConsent
);

router.get(
  '/gdpr/consent/:employee_id',
  authorize(['compliance.view']),
  complianceController.getEmployeeConsents
);

router.get(
  '/gdpr/export/:employee_id',
  authorize(['compliance.export']),
  complianceController.exportEmployeeData
);

router.delete(
  '/gdpr/delete/:employee_id',
  authorize(['compliance.delete']),
  complianceController.deleteEmployeeData
);

// ==================== COMPLIANCE REPORTS ====================

router.get(
  '/reports/:report_type',
  authorize(['compliance.view']),
  complianceController.getComplianceReport
);

export default router;
