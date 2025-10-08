import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface AuditLog {
  audit_id: string;
  organization_id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject' | 'export';
  before_data?: any;
  after_data?: any;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: Date;
}

interface ComplianceDocument {
  document_id: string;
  organization_id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  document_number?: string;
  issuing_authority?: string;
  issue_date?: Date;
  expiry_date?: Date;
  verification_status: 'pending' | 'in_progress' | 'verified' | 'rejected' | 'expired';
  verified_by?: string;
  verified_at?: Date;
  verification_notes?: string;
  file_path?: string;
  created_at: Date;
}

interface DataRetentionPolicy {
  policy_id: string;
  organization_id: string;
  entity_type: string;
  retention_period_days: number;
  delete_after_retention: boolean;
  anonymize_after_retention: boolean;
  is_active: boolean;
  created_at: Date;
}

interface GDPRConsent {
  consent_id: string;
  employee_id: string;
  consent_type: string;
  consent_given: boolean;
  consent_date: Date;
  consent_withdrawn_date?: Date;
  ip_address?: string;
  created_at: Date;
}

export class ComplianceService {
  constructor(private db: Pool) {}

  // ==================== AUDIT LOGGING ====================

  async createAuditLog(data: {
    organization_id: string;
    user_id?: string;
    entity_type: string;
    entity_id: string;
    action: string;
    before_data?: any;
    after_data?: any;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
  }): Promise<AuditLog> {
    const audit_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO audit_logs (
        audit_id, organization_id, user_id, entity_type, entity_id,
        action, before_data, after_data, ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        audit_id,
        data.organization_id,
        data.user_id,
        data.entity_type,
        data.entity_id,
        data.action,
        JSON.stringify(data.before_data),
        JSON.stringify(data.after_data),
        data.ip_address,
        data.user_agent,
        JSON.stringify(data.metadata),
      ]
    );

    return result.rows[0];
  }

  async getAuditLogs(
    organization_id: string,
    filters?: {
      entity_type?: string;
      entity_id?: string;
      user_id?: string;
      action?: string;
      start_date?: Date;
      end_date?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let query = `
      SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN employees u ON al.user_id = u.employee_id
      WHERE al.organization_id = $1
    `;
    const params: any[] = [organization_id];
    let paramCounter = 2;

    if (filters?.entity_type) {
      query += ` AND al.entity_type = $${paramCounter}`;
      params.push(filters.entity_type);
      paramCounter++;
    }

    if (filters?.entity_id) {
      query += ` AND al.entity_id = $${paramCounter}`;
      params.push(filters.entity_id);
      paramCounter++;
    }

    if (filters?.user_id) {
      query += ` AND al.user_id = $${paramCounter}`;
      params.push(filters.user_id);
      paramCounter++;
    }

    if (filters?.action) {
      query += ` AND al.action = $${paramCounter}`;
      params.push(filters.action);
      paramCounter++;
    }

    if (filters?.start_date) {
      query += ` AND al.created_at >= $${paramCounter}`;
      params.push(filters.start_date);
      paramCounter++;
    }

    if (filters?.end_date) {
      query += ` AND al.created_at <= $${paramCounter}`;
      params.push(filters.end_date);
      paramCounter++;
    }

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM (${query}) as count_query`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    query += ` ORDER BY al.created_at DESC`;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(filters?.limit || 50, filters?.offset || 0);

    const result = await this.db.query(query, params);

    return {
      logs: result.rows,
      total,
    };
  }

  async getAuditTrail(
    organization_id: string,
    entity_type: string,
    entity_id: string
  ): Promise<AuditLog[]> {
    const result = await this.db.query(
      `SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN employees u ON al.user_id = u.employee_id
      WHERE al.organization_id = $1 
        AND al.entity_type = $2 
        AND al.entity_id = $3
      ORDER BY al.created_at DESC`,
      [organization_id, entity_type, entity_id]
    );

    return result.rows;
  }

  // ==================== COMPLIANCE DOCUMENTS ====================

  async createComplianceDocument(data: {
    organization_id: string;
    employee_id: string;
    document_type: string;
    document_name: string;
    document_number?: string;
    issuing_authority?: string;
    issue_date?: Date;
    expiry_date?: Date;
    file_path?: string;
  }): Promise<ComplianceDocument> {
    const document_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO compliance_documents (
        document_id, organization_id, employee_id, document_type,
        document_name, document_number, issuing_authority,
        issue_date, expiry_date, verification_status, file_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        document_id,
        data.organization_id,
        data.employee_id,
        data.document_type,
        data.document_name,
        data.document_number,
        data.issuing_authority,
        data.issue_date,
        data.expiry_date,
        'pending',
        data.file_path,
      ]
    );

    return result.rows[0];
  }

  async verifyDocument(
    document_id: string,
    verified_by: string,
    verification_status: string,
    verification_notes?: string
  ): Promise<ComplianceDocument> {
    const result = await this.db.query(
      `UPDATE compliance_documents
       SET verification_status = $1,
           verified_by = $2,
           verified_at = NOW(),
           verification_notes = $3,
           modified_at = NOW()
       WHERE document_id = $4 AND is_deleted = FALSE
       RETURNING *`,
      [verification_status, verified_by, verification_notes, document_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Document not found', 404);
    }

    return result.rows[0];
  }

  async getEmployeeDocuments(
    employee_id: string,
    organization_id: string,
    filters?: { document_type?: string; verification_status?: string }
  ): Promise<ComplianceDocument[]> {
    let query = `
      SELECT 
        cd.*,
        e.first_name || ' ' || e.last_name as employee_name,
        v.first_name || ' ' || v.last_name as verified_by_name
      FROM compliance_documents cd
      INNER JOIN employees e ON cd.employee_id = e.employee_id
      LEFT JOIN employees v ON cd.verified_by = v.employee_id
      WHERE cd.employee_id = $1 
        AND cd.organization_id = $2
        AND cd.is_deleted = FALSE
    `;
    const params: any[] = [employee_id, organization_id];
    let paramCounter = 3;

    if (filters?.document_type) {
      query += ` AND cd.document_type = $${paramCounter}`;
      params.push(filters.document_type);
      paramCounter++;
    }

    if (filters?.verification_status) {
      query += ` AND cd.verification_status = $${paramCounter}`;
      params.push(filters.verification_status);
      paramCounter++;
    }

    query += ` ORDER BY cd.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getExpiringDocuments(
    organization_id: string,
    days_before_expiry: number = 30
  ): Promise<ComplianceDocument[]> {
    const result = await this.db.query(
      `SELECT 
        cd.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email as employee_email,
        e.employee_code
      FROM compliance_documents cd
      INNER JOIN employees e ON cd.employee_id = e.employee_id
      WHERE cd.organization_id = $1
        AND cd.expiry_date IS NOT NULL
        AND cd.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '1 day' * $2
        AND cd.verification_status = 'verified'
        AND cd.is_deleted = FALSE
      ORDER BY cd.expiry_date ASC`,
      [organization_id, days_before_expiry]
    );

    return result.rows;
  }

  // ==================== DATA RETENTION POLICIES ====================

  async createRetentionPolicy(data: {
    organization_id: string;
    entity_type: string;
    retention_period_days: number;
    delete_after_retention?: boolean;
    anonymize_after_retention?: boolean;
  }): Promise<DataRetentionPolicy> {
    const policy_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO data_retention_policies (
        policy_id, organization_id, entity_type, retention_period_days,
        delete_after_retention, anonymize_after_retention, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        policy_id,
        data.organization_id,
        data.entity_type,
        data.retention_period_days,
        data.delete_after_retention ?? false,
        data.anonymize_after_retention ?? false,
        true,
      ]
    );

    return result.rows[0];
  }

  async getRetentionPolicies(organization_id: string): Promise<DataRetentionPolicy[]> {
    const result = await this.db.query(
      `SELECT * FROM data_retention_policies
       WHERE organization_id = $1 AND is_deleted = FALSE
       ORDER BY entity_type ASC`,
      [organization_id]
    );

    return result.rows;
  }

  async applyRetentionPolicies(organization_id: string): Promise<any> {
    const policies = await this.getRetentionPolicies(organization_id);

    const results: any = {};

    for (const policy of policies) {
      if (!policy.is_active) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      if (policy.delete_after_retention) {
        // Soft delete old records
        const deleteResult = await this.db.query(
          `UPDATE ${policy.entity_type}
           SET is_deleted = TRUE, modified_at = NOW()
           WHERE organization_id = $1 
             AND created_at < $2 
             AND is_deleted = FALSE`,
          [organization_id, cutoffDate]
        );

        results[policy.entity_type] = {
          deleted: deleteResult.rowCount,
        };
      } else if (policy.anonymize_after_retention) {
        // Anonymize PII data
        // This would need custom logic per entity type
        results[policy.entity_type] = {
          anonymized: 0,
          note: 'Anonymization logic needs to be implemented per entity type',
        };
      }
    }

    return results;
  }

  // ==================== GDPR CONSENT MANAGEMENT ====================

  async recordConsent(data: {
    employee_id: string;
    consent_type: string;
    consent_given: boolean;
    ip_address?: string;
  }): Promise<GDPRConsent> {
    const consent_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO gdpr_consents (
        consent_id, employee_id, consent_type, consent_given,
        consent_date, ip_address
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *`,
      [consent_id, data.employee_id, data.consent_type, data.consent_given, data.ip_address]
    );

    return result.rows[0];
  }

  async withdrawConsent(
    employee_id: string,
    consent_type: string
  ): Promise<GDPRConsent> {
    const result = await this.db.query(
      `UPDATE gdpr_consents
       SET consent_given = FALSE,
           consent_withdrawn_date = NOW()
       WHERE employee_id = $1 
         AND consent_type = $2 
         AND consent_given = TRUE
         AND consent_withdrawn_date IS NULL
       RETURNING *`,
      [employee_id, consent_type]
    );

    if (result.rows.length === 0) {
      throw new AppError('Active consent not found', 404);
    }

    return result.rows[0];
  }

  async getEmployeeConsents(employee_id: string): Promise<GDPRConsent[]> {
    const result = await this.db.query(
      `SELECT * FROM gdpr_consents
       WHERE employee_id = $1
       ORDER BY consent_date DESC`,
      [employee_id]
    );

    return result.rows;
  }

  async exportEmployeeData(
    employee_id: string,
    organization_id: string
  ): Promise<any> {
    // GDPR Right to Data Portability
    // Gather all employee data from various tables

    const employeeData: any = {};

    // Basic employee info
    const empResult = await this.db.query(
      `SELECT * FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [employee_id, organization_id]
    );
    employeeData.personal_info = empResult.rows[0];

    // Attendance records
    const attendanceResult = await this.db.query(
      `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 1000`,
      [employee_id]
    );
    employeeData.attendance = attendanceResult.rows;

    // Leave records
    const leaveResult = await this.db.query(
      `SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employee_id]
    );
    employeeData.leave_requests = leaveResult.rows;

    // Performance data
    const goalsResult = await this.db.query(
      `SELECT * FROM performance_goals WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employee_id]
    );
    employeeData.performance_goals = goalsResult.rows;

    const reviewsResult = await this.db.query(
      `SELECT * FROM performance_reviews WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employee_id]
    );
    employeeData.performance_reviews = reviewsResult.rows;

    // Timesheet data
    const timesheetResult = await this.db.query(
      `SELECT * FROM timesheet_entries WHERE employee_id = $1 ORDER BY work_date DESC LIMIT 1000`,
      [employee_id]
    );
    employeeData.timesheet = timesheetResult.rows;

    // Compliance documents
    const documentsResult = await this.db.query(
      `SELECT * FROM compliance_documents WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employee_id]
    );
    employeeData.documents = documentsResult.rows;

    // Consents
    const consentsResult = await this.db.query(
      `SELECT * FROM gdpr_consents WHERE employee_id = $1 ORDER BY consent_date DESC`,
      [employee_id]
    );
    employeeData.consents = consentsResult.rows;

    return employeeData;
  }

  async deleteEmployeeData(
    employee_id: string,
    organization_id: string
  ): Promise<void> {
    // GDPR Right to be Forgotten
    // This should be used carefully and only when legally permitted

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Instead of hard delete, we'll anonymize the data
      await client.query(
        `UPDATE employees
         SET first_name = 'DELETED',
             last_name = 'USER',
             email = 'deleted_' || employee_id || '@deleted.com',
             phone_number = NULL,
             date_of_birth = NULL,
             personal_email = NULL,
             is_deleted = TRUE,
             modified_at = NOW()
         WHERE employee_id = $1 AND organization_id = $2`,
        [employee_id, organization_id]
      );

      // Mark other records as deleted
      const tables = [
        'attendance',
        'leave_requests',
        'performance_goals',
        'performance_reviews',
        'timesheet_entries',
        'compliance_documents',
        'employee_onboarding',
        'employee_offboarding',
      ];

      for (const table of tables) {
        await client.query(
          `UPDATE ${table}
           SET is_deleted = TRUE, modified_at = NOW()
           WHERE employee_id = $1`,
          [employee_id]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== COMPLIANCE REPORTS ====================

  async getComplianceReport(
    organization_id: string,
    report_type: string
  ): Promise<any> {
    const report: any = {
      organization_id,
      report_type,
      generated_at: new Date(),
      data: {},
    };

    switch (report_type) {
      case 'document_verification':
        const docStats = await this.db.query(
          `SELECT 
            document_type,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
            COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE verification_status = 'expired') as expired
          FROM compliance_documents
          WHERE organization_id = $1 AND is_deleted = FALSE
          GROUP BY document_type`,
          [organization_id]
        );
        report.data = docStats.rows;
        break;

      case 'data_retention':
        const policies = await this.getRetentionPolicies(organization_id);
        report.data = policies;
        break;

      case 'audit_activity':
        const auditStats = await this.db.query(
          `SELECT 
            entity_type,
            action,
            COUNT(*) as count,
            MAX(created_at) as last_activity
          FROM audit_logs
          WHERE organization_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY entity_type, action
          ORDER BY count DESC`,
          [organization_id]
        );
        report.data = auditStats.rows;
        break;

      case 'gdpr_consents':
        const consentStats = await this.db.query(
          `SELECT 
            consent_type,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE consent_given = TRUE AND consent_withdrawn_date IS NULL) as active,
            COUNT(*) FILTER (WHERE consent_withdrawn_date IS NOT NULL) as withdrawn
          FROM gdpr_consents gc
          INNER JOIN employees e ON gc.employee_id = e.employee_id
          WHERE e.organization_id = $1
          GROUP BY consent_type`,
          [organization_id]
        );
        report.data = consentStats.rows;
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    return report;
  }
}
