import { Request, Response, NextFunction } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { pool } from '../config/database';

const complianceService = new ComplianceService(pool);

export class ComplianceController {
  // ==================== AUDIT LOGS ====================

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const {
        entity_type,
        entity_id,
        user_id,
        action,
        start_date,
        end_date,
        limit,
        offset,
      } = req.query;

      const filters: any = {};
      if (entity_type) filters.entity_type = entity_type as string;
      if (entity_id) filters.entity_id = entity_id as string;
      if (user_id) filters.user_id = user_id as string;
      if (action) filters.action = action as string;
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await complianceService.getAuditLogs(organization_id, filters);

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditTrail(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { entity_type, entity_id } = req.params;

      const trail = await complianceService.getAuditTrail(
        organization_id,
        entity_type,
        entity_id
      );

      res.json({
        success: true,
        data: trail,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COMPLIANCE DOCUMENTS ====================

  async createDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const document = await complianceService.createComplianceDocument({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Compliance document created successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id } = req.user!;
      const { document_id } = req.params;
      const { verification_status, verification_notes } = req.body;

      const document = await complianceService.verifyDocument(
        document_id,
        user_id,
        verification_status,
        verification_notes
      );

      res.json({
        success: true,
        message: 'Document verification status updated',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { employee_id } = req.params;
      const { document_type, verification_status } = req.query;

      const filters: any = {};
      if (document_type) filters.document_type = document_type as string;
      if (verification_status) filters.verification_status = verification_status as string;

      const documents = await complianceService.getEmployeeDocuments(
        employee_id,
        organization_id,
        filters
      );

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  async getExpiringDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const days_before_expiry = parseInt(req.query.days as string) || 30;

      const documents = await complianceService.getExpiringDocuments(
        organization_id,
        days_before_expiry
      );

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== DATA RETENTION POLICIES ====================

  async createRetentionPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const policy = await complianceService.createRetentionPolicy({
        ...req.body,
        organization_id,
      });

      res.status(201).json({
        success: true,
        message: 'Data retention policy created successfully',
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRetentionPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const policies = await complianceService.getRetentionPolicies(organization_id);

      res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  }

  async applyRetentionPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;

      const results = await complianceService.applyRetentionPolicies(organization_id);

      res.json({
        success: true,
        message: 'Data retention policies applied successfully',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GDPR COMPLIANCE ====================

  async recordConsent(req: Request, res: Response, next: NextFunction) {
    try {
      const consent = await complianceService.recordConsent({
        ...req.body,
        ip_address: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Consent recorded successfully',
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }

  async withdrawConsent(req: Request, res: Response, next: NextFunction) {
    try {
      const { employee_id, consent_type } = req.body;

      const consent = await complianceService.withdrawConsent(employee_id, consent_type);

      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeConsents(req: Request, res: Response, next: NextFunction) {
    try {
      const { employee_id } = req.params;

      const consents = await complianceService.getEmployeeConsents(employee_id);

      res.json({
        success: true,
        data: consents,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportEmployeeData(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { employee_id } = req.params;

      // Log the export action for audit
      await complianceService.createAuditLog({
        organization_id,
        user_id,
        entity_type: 'employee',
        entity_id: employee_id,
        action: 'export',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        metadata: { export_type: 'gdpr_data_portability' },
      });

      const data = await complianceService.exportEmployeeData(employee_id, organization_id);

      res.json({
        success: true,
        message: 'Employee data exported successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployeeData(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id, user_id } = req.user!;
      const { employee_id } = req.params;

      // Log the delete action for audit
      await complianceService.createAuditLog({
        organization_id,
        user_id,
        entity_type: 'employee',
        entity_id: employee_id,
        action: 'delete',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        metadata: { deletion_type: 'gdpr_right_to_be_forgotten' },
      });

      await complianceService.deleteEmployeeData(employee_id, organization_id);

      res.json({
        success: true,
        message: 'Employee data deleted/anonymized successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COMPLIANCE REPORTS ====================

  async getComplianceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { organization_id } = req.user!;
      const { report_type } = req.params;

      const report = await complianceService.getComplianceReport(
        organization_id,
        report_type
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const complianceController = new ComplianceController();
