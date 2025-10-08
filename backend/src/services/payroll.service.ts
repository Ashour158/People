import { query } from '../config/database';
import { getPaginationParams } from '../utils/pagination';

export class PayrollService {
  async createComponent(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO compensation_components
       (organization_id, component_name, component_code, component_type, calculation_type,
        calculation_value, is_taxable, is_visible_on_payslip, display_order, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        organizationId,
        data.component_name,
        data.component_code,
        data.component_type,
        data.calculation_type,
        data.calculation_value,
        data.is_taxable,
        data.is_visible_on_payslip,
        data.display_order,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getComponents(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE organization_id = $1 AND is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.component_type) {
      queryParams.push(params.component_type);
      whereClause += ` AND component_type = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM compensation_components ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT * FROM compensation_components
       ${whereClause}
       ORDER BY display_order, component_name
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getComponentById(organizationId: string, componentId: string) {
    const result = await query(
      'SELECT * FROM compensation_components WHERE organization_id = $1 AND component_id = $2 AND is_deleted = FALSE',
      [organizationId, componentId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Component not found');
    }
    
    return result.rows[0];
  }

  async updateComponent(organizationId: string, componentId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE compensation_components
       SET component_name = COALESCE($3, component_name),
           component_type = COALESCE($4, component_type),
           calculation_type = COALESCE($5, calculation_type),
           calculation_value = COALESCE($6, calculation_value),
           is_taxable = COALESCE($7, is_taxable),
           is_visible_on_payslip = COALESCE($8, is_visible_on_payslip),
           display_order = COALESCE($9, display_order),
           modified_by = $10,
           modified_at = NOW()
       WHERE organization_id = $1 AND component_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [
        organizationId,
        componentId,
        data.component_name,
        data.component_type,
        data.calculation_type,
        data.calculation_value,
        data.is_taxable,
        data.is_visible_on_payslip,
        data.display_order,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Component not found');
    }

    return result.rows[0];
  }

  async deleteComponent(organizationId: string, componentId: string) {
    const result = await query(
      `UPDATE compensation_components
       SET is_deleted = TRUE, modified_at = NOW()
       WHERE organization_id = $1 AND component_id = $2
       RETURNING component_id`,
      [organizationId, componentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Component not found');
    }
  }

  async createEmployeeCompensation(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO employee_compensation
       (organization_id, employee_id, effective_from_date, annual_ctc, monthly_gross,
        salary_type, payment_frequency, payment_mode, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        organizationId,
        data.employee_id,
        data.effective_from_date,
        data.annual_ctc,
        data.monthly_gross,
        data.salary_type,
        data.payment_frequency,
        data.payment_mode,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getEmployeeCompensation(organizationId: string, employeeId: string) {
    const result = await query(
      `SELECT ec.*, e.first_name, e.last_name, e.employee_code
       FROM employee_compensation ec
       JOIN employees e ON ec.employee_id = e.employee_id
       WHERE ec.organization_id = $1 AND ec.employee_id = $2 AND ec.is_deleted = FALSE
       ORDER BY ec.effective_from_date DESC`,
      [organizationId, employeeId]
    );
    
    return result.rows;
  }

  async updateEmployeeCompensation(organizationId: string, compensationId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE employee_compensation
       SET annual_ctc = COALESCE($3, annual_ctc),
           monthly_gross = COALESCE($4, monthly_gross),
           salary_type = COALESCE($5, salary_type),
           payment_frequency = COALESCE($6, payment_frequency),
           payment_mode = COALESCE($7, payment_mode),
           modified_by = $8,
           modified_at = NOW()
       WHERE organization_id = $1 AND compensation_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [
        organizationId,
        compensationId,
        data.annual_ctc,
        data.monthly_gross,
        data.salary_type,
        data.payment_frequency,
        data.payment_mode,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Employee compensation not found');
    }

    return result.rows[0];
  }

  async createPayrollRun(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO payroll_runs
       (organization_id, run_name, run_code, period_month, period_year,
        pay_date, run_status, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
       RETURNING *`,
      [
        organizationId,
        data.run_name,
        data.run_code,
        data.period_month,
        data.period_year,
        data.pay_date,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getPayrollRuns(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE organization_id = $1 AND is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.period_year) {
      queryParams.push(params.period_year);
      whereClause += ` AND period_year = $${queryParams.length}`;
    }
    
    if (params.period_month) {
      queryParams.push(params.period_month);
      whereClause += ` AND period_month = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM payroll_runs ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT * FROM payroll_runs
       ${whereClause}
       ORDER BY period_year DESC, period_month DESC, created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getPayrollRunById(organizationId: string, runId: string) {
    const result = await query(
      'SELECT * FROM payroll_runs WHERE organization_id = $1 AND run_id = $2 AND is_deleted = FALSE',
      [organizationId, runId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Payroll run not found');
    }
    
    return result.rows[0];
  }

  async processPayrollRun(organizationId: string, runId: string, userId: string) {
    const result = await query(
      `UPDATE payroll_runs
       SET run_status = 'processing',
           processed_at = NOW(),
           processed_by = $3,
           modified_by = $3,
           modified_at = NOW()
       WHERE organization_id = $1 AND run_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [organizationId, runId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payroll run not found');
    }

    // In a real implementation, this would trigger background processing
    // For now, we'll just mark it as processed
    await query(
      `UPDATE payroll_runs
       SET run_status = 'processed'
       WHERE run_id = $1`,
      [runId]
    );

    return result.rows[0];
  }

  async finalizePayrollRun(organizationId: string, runId: string, userId: string) {
    const result = await query(
      `UPDATE payroll_runs
       SET run_status = 'finalized',
           finalized_at = NOW(),
           finalized_by = $3,
           modified_by = $3,
           modified_at = NOW()
       WHERE organization_id = $1 AND run_id = $2 AND run_status = 'processed' AND is_deleted = FALSE
       RETURNING *`,
      [organizationId, runId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payroll run not found or not in correct status for finalization');
    }

    return result.rows[0];
  }

  async regeneratePayslips(organizationId: string, runId: string, userId: string) {
    // In a real implementation, this would regenerate all payslips for the run
    await query(
      `UPDATE payroll_runs
       SET modified_by = $3,
           modified_at = NOW()
       WHERE organization_id = $1 AND run_id = $2 AND is_deleted = FALSE`,
      [organizationId, runId, userId]
    );
  }

  async getPayslips(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE ps.organization_id = $1 AND ps.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.employee_id) {
      queryParams.push(params.employee_id);
      whereClause += ` AND ps.employee_id = $${queryParams.length}`;
    }
    
    if (params.run_id) {
      queryParams.push(params.run_id);
      whereClause += ` AND ps.run_id = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM payroll_payslips ps ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT ps.*, e.first_name, e.last_name, e.employee_code,
              pr.run_name, pr.period_month, pr.period_year
       FROM payroll_payslips ps
       JOIN employees e ON ps.employee_id = e.employee_id
       JOIN payroll_runs pr ON ps.run_id = pr.run_id
       ${whereClause}
       ORDER BY ps.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getPayslipById(organizationId: string, payslipId: string) {
    const result = await query(
      `SELECT ps.*, e.first_name, e.last_name, e.employee_code,
              pr.run_name, pr.period_month, pr.period_year
       FROM payroll_payslips ps
       JOIN employees e ON ps.employee_id = e.employee_id
       JOIN payroll_runs pr ON ps.run_id = pr.run_id
       WHERE ps.organization_id = $1 AND ps.payslip_id = $2 AND ps.is_deleted = FALSE`,
      [organizationId, payslipId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Payslip not found');
    }
    
    return result.rows[0];
  }
}
