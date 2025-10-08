// =====================================================
// PostgreSQL Repository Implementations (Skeleton)
// Basic implementations with NotImplementedError for complex operations
// =====================================================

import { Pool } from 'pg';
import { 
  IEmployeeRepository, 
  ILeaveRepository, 
  IPayrollRunRepository,
  IEventOutboxRepository,
  IAuditLogRepository 
} from './interfaces';
import { Employee } from '../domain/Employee';
import { LeaveType } from '../domain/LeaveType';
import { LeaveRequest } from '../domain/LeaveRequest';
import { PayrollRun } from '../domain/PayrollRun';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`Method ${method} is not yet implemented`);
    this.name = 'NotImplementedError';
  }
}

// =====================================================
// EMPLOYEE REPOSITORY
// =====================================================

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private pool: Pool) {}

  async findById(employeeId: string, organizationId: string): Promise<Employee | null> {
    throw new NotImplementedError('EmployeeRepository.findById');
  }

  async findByEmail(email: string, organizationId: string): Promise<Employee | null> {
    throw new NotImplementedError('EmployeeRepository.findByEmail');
  }

  async findByEmployeeCode(employeeCode: string, organizationId: string): Promise<Employee | null> {
    throw new NotImplementedError('EmployeeRepository.findByEmployeeCode');
  }

  async findAll(
    organizationId: string,
    filters?: {
      departmentId?: string;
      status?: string;
      searchTerm?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ employees: Employee[]; total: number }> {
    throw new NotImplementedError('EmployeeRepository.findAll');
  }

  async create(employee: Employee): Promise<Employee> {
    const data = employee.toJSON();
    const query = `
      INSERT INTO employees (
        employee_id, organization_id, employee_code, first_name, last_name,
        email, hire_date, employment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      data.employee_id,
      data.organization_id,
      data.employee_id, // Using as employee_code for now
      data.first_name,
      data.last_name,
      data.email,
      data.hire_date,
      data.employment_status
    ];

    const result = await this.pool.query(query, values);
    return employee; // Simplified - return the same employee
  }

  async update(employeeId: string, organizationId: string, data: Partial<Employee>): Promise<Employee> {
    throw new NotImplementedError('EmployeeRepository.update');
  }

  async softDelete(employeeId: string, organizationId: string): Promise<boolean> {
    throw new NotImplementedError('EmployeeRepository.softDelete');
  }

  async countByOrganization(organizationId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM employees WHERE organization_id = $1 AND is_deleted = FALSE';
    const result = await this.pool.query(query, [organizationId]);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}

// =====================================================
// LEAVE REPOSITORY
// =====================================================

export class LeaveRepository implements ILeaveRepository {
  constructor(private pool: Pool) {}

  async findLeaveTypeById(leaveTypeId: string, organizationId: string): Promise<LeaveType | null> {
    const query = `
      SELECT *
      FROM leave_types
      WHERE leave_type_id = $1
        AND organization_id = $2
        AND is_deleted = FALSE
    `;
    
    const result = await this.pool.query(query, [leaveTypeId, organizationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return new LeaveType({
      leave_type_id: row.leave_type_id,
      organization_id: row.organization_id,
      leave_type_name: row.leave_type_name || row.name,
      leave_type_code: row.leave_type_code || row.code,
      description: row.description,
      max_days_per_year: row.max_days_per_year ? parseFloat(row.max_days_per_year) : undefined,
      carry_forward_allowed: row.carry_forward_allowed,
      max_carry_forward_days: row.max_carry_forward_days ? parseFloat(row.max_carry_forward_days) : undefined,
      requires_approval: row.requires_approval,
      approval_levels: row.approval_levels ? parseInt(row.approval_levels) : undefined,
      is_accrual_based: row.is_accrual_based,
      accrual_rate: row.accrual_rate ? parseFloat(row.accrual_rate) : undefined,
      accrual_frequency: row.accrual_frequency,
      applicable_for_gender: row.applicable_for_gender,
      is_active: row.is_active,
    });
  }

  async findAllLeaveTypes(organizationId: string): Promise<LeaveType[]> {
    const query = `
      SELECT *
      FROM leave_types
      WHERE organization_id = $1
        AND is_deleted = FALSE
      ORDER BY leave_type_name ASC
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    
    return result.rows.map(row => new LeaveType({
      leave_type_id: row.leave_type_id,
      organization_id: row.organization_id,
      leave_type_name: row.leave_type_name || row.name,
      leave_type_code: row.leave_type_code || row.code,
      description: row.description,
      max_days_per_year: row.max_days_per_year ? parseFloat(row.max_days_per_year) : undefined,
      carry_forward_allowed: row.carry_forward_allowed,
      max_carry_forward_days: row.max_carry_forward_days ? parseFloat(row.max_carry_forward_days) : undefined,
      requires_approval: row.requires_approval,
      approval_levels: row.approval_levels ? parseInt(row.approval_levels) : undefined,
      is_accrual_based: row.is_accrual_based,
      accrual_rate: row.accrual_rate ? parseFloat(row.accrual_rate) : undefined,
      accrual_frequency: row.accrual_frequency,
      applicable_for_gender: row.applicable_for_gender,
      is_active: row.is_active,
    }));
  }

  async createLeaveType(leaveType: LeaveType): Promise<LeaveType> {
    const data = leaveType.toJSON();
    const query = `
      INSERT INTO leave_types (
        leave_type_id, organization_id, leave_type_name, leave_type_code, description,
        max_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval,
        approval_levels, is_accrual_based, accrual_rate, accrual_frequency,
        applicable_for_gender, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      data.leave_type_id,
      data.organization_id,
      data.leave_type_name,
      data.leave_type_code,
      data.description || null,
      data.max_days_per_year,
      data.carry_forward_allowed,
      data.max_carry_forward_days,
      data.requires_approval,
      data.approval_levels,
      data.is_accrual_based,
      data.accrual_rate,
      data.accrual_frequency,
      data.applicable_for_gender,
      data.is_active,
    ];
    
    await this.pool.query(query, values);
    return leaveType;
  }

  async findLeaveRequestById(requestId: string, organizationId: string): Promise<LeaveRequest | null> {
    const query = `
      SELECT *
      FROM leave_requests
      WHERE leave_request_id = $1
        AND organization_id = $2
        AND is_deleted = FALSE
    `;
    
    const result = await this.pool.query(query, [requestId, organizationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return new LeaveRequest({
      leave_request_id: row.leave_request_id,
      organization_id: row.organization_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      start_date: row.start_date,
      end_date: row.end_date,
      total_days: parseFloat(row.total_days),
      reason: row.reason,
      emergency_contact: row.emergency_contact,
      status: row.status,
      current_approver_id: row.current_approver_id,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
    });
  }

  async findLeaveRequestsByEmployee(
    employeeId: string,
    organizationId: string,
    filters?: { status?: string; year?: number; page?: number; limit?: number }
  ): Promise<{ requests: LeaveRequest[]; total: number }> {
    const conditions: string[] = ['employee_id = $1', 'organization_id = $2', 'is_deleted = FALSE'];
    const values: any[] = [employeeId, organizationId];
    let paramIndex = 3;
    
    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters?.year) {
      conditions.push(`EXTRACT(YEAR FROM start_date) = $${paramIndex++}`);
      values.push(filters.year);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM leave_requests WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    
    // Get paginated results
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT *
      FROM leave_requests
      WHERE ${whereClause}
      ORDER BY start_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    values.push(limit, offset);
    const result = await this.pool.query(query, values);
    
    const requests = result.rows.map(row => new LeaveRequest({
      leave_request_id: row.leave_request_id,
      organization_id: row.organization_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      start_date: row.start_date,
      end_date: row.end_date,
      total_days: parseFloat(row.total_days),
      reason: row.reason,
      emergency_contact: row.emergency_contact,
      status: row.status,
      current_approver_id: row.current_approver_id,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
    }));
    
    return { requests, total };
  }

  async findPendingLeaveRequests(approverId: string, organizationId: string): Promise<LeaveRequest[]> {
    const query = `
      SELECT *
      FROM leave_requests
      WHERE current_approver_id = $1
        AND organization_id = $2
        AND status = 'pending'
        AND is_deleted = FALSE
      ORDER BY start_date ASC
    `;
    
    const result = await this.pool.query(query, [approverId, organizationId]);
    
    return result.rows.map(row => new LeaveRequest({
      leave_request_id: row.leave_request_id,
      organization_id: row.organization_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      start_date: row.start_date,
      end_date: row.end_date,
      total_days: parseFloat(row.total_days),
      reason: row.reason,
      emergency_contact: row.emergency_contact,
      status: row.status,
      current_approver_id: row.current_approver_id,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
    }));
  }

  async createLeaveRequest(request: LeaveRequest): Promise<LeaveRequest> {
    const data = request.toJSON();
    const query = `
      INSERT INTO leave_requests (
        leave_request_id, organization_id, employee_id, leave_type_id,
        start_date, end_date, total_days, reason, emergency_contact,
        status, current_approver_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      data.leave_request_id,
      data.organization_id,
      data.employee_id,
      data.leave_type_id,
      data.start_date,
      data.end_date,
      data.total_days,
      data.reason,
      data.emergency_contact || null,
      data.status,
      data.current_approver_id || null,
    ];
    
    await this.pool.query(query, values);
    return request;
  }

  async updateLeaveRequest(requestId: string, organizationId: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic update query based on provided fields
    const dataJson = data as any;
    
    if (dataJson.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dataJson.status);
    }
    
    if (dataJson.approved_by !== undefined) {
      updates.push(`approved_by = $${paramIndex++}`);
      values.push(dataJson.approved_by);
    }
    
    if (dataJson.approved_at !== undefined) {
      updates.push(`approved_at = $${paramIndex++}`);
      values.push(dataJson.approved_at);
    }
    
    if (dataJson.rejected_by !== undefined) {
      updates.push(`rejected_by = $${paramIndex++}`);
      values.push(dataJson.rejected_by);
    }
    
    if (dataJson.rejected_at !== undefined) {
      updates.push(`rejected_at = $${paramIndex++}`);
      values.push(dataJson.rejected_at);
    }
    
    if (dataJson.rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      values.push(dataJson.rejection_reason);
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    updates.push(`modified_at = NOW()`);
    
    const query = `
      UPDATE leave_requests
      SET ${updates.join(', ')}
      WHERE leave_request_id = $${paramIndex++}
        AND organization_id = $${paramIndex++}
        AND is_deleted = FALSE
      RETURNING *
    `;
    
    values.push(requestId, organizationId);
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Leave request not found');
    }
    
    // Return a LeaveRequest domain object from the database result
    const row = result.rows[0];
    return new LeaveRequest({
      leave_request_id: row.leave_request_id,
      organization_id: row.organization_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      start_date: row.start_date,
      end_date: row.end_date,
      total_days: parseFloat(row.total_days),
      reason: row.reason,
      emergency_contact: row.emergency_contact,
      status: row.status,
      current_approver_id: row.current_approver_id,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
    });
  }

  async getLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    organizationId: string
  ): Promise<{ allocated_days: number; used_days: number; pending_days: number; available_days: number } | null> {
    const query = `
      SELECT allocated_days, used_days, pending_days, available_days
      FROM leave_balances
      WHERE employee_id = $1 
        AND leave_type_id = $2 
        AND year = $3 
        AND organization_id = $4
        AND is_deleted = FALSE
    `;
    
    const result = await this.pool.query(query, [employeeId, leaveTypeId, year, organizationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      allocated_days: parseFloat(result.rows[0].allocated_days),
      used_days: parseFloat(result.rows[0].used_days),
      pending_days: parseFloat(result.rows[0].pending_days),
      available_days: parseFloat(result.rows[0].available_days),
    };
  }

  async updateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    organizationId: string,
    balance: { allocated_days?: number; used_days?: number; pending_days?: number; available_days?: number }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (balance.allocated_days !== undefined) {
      updates.push(`allocated_days = $${paramIndex++}`);
      values.push(balance.allocated_days);
    }
    
    if (balance.used_days !== undefined) {
      updates.push(`used_days = $${paramIndex++}`);
      values.push(balance.used_days);
    }
    
    if (balance.pending_days !== undefined) {
      updates.push(`pending_days = $${paramIndex++}`);
      values.push(balance.pending_days);
    }
    
    if (balance.available_days !== undefined) {
      updates.push(`available_days = $${paramIndex++}`);
      values.push(balance.available_days);
    }
    
    if (updates.length === 0) {
      return;
    }
    
    updates.push(`modified_at = NOW()`);
    
    const query = `
      UPDATE leave_balances
      SET ${updates.join(', ')}
      WHERE employee_id = $${paramIndex++}
        AND leave_type_id = $${paramIndex++}
        AND year = $${paramIndex++}
        AND organization_id = $${paramIndex++}
        AND is_deleted = FALSE
    `;
    
    values.push(employeeId, leaveTypeId, year, organizationId);
    await this.pool.query(query, values);
  }
}

// =====================================================
// PAYROLL RUN REPOSITORY
// =====================================================

export class PayrollRunRepository implements IPayrollRunRepository {
  constructor(private pool: Pool) {}

  async findById(payrollRunId: string, organizationId: string): Promise<PayrollRun | null> {
    const query = `
      SELECT *
      FROM payroll_runs
      WHERE payroll_run_id = $1
        AND organization_id = $2
        AND is_deleted = FALSE
    `;
    
    const result = await this.pool.query(query, [payrollRunId, organizationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return new PayrollRun({
      payroll_run_id: row.payroll_run_id,
      organization_id: row.organization_id,
      company_id: row.company_id,
      period_year: parseInt(row.period_year),
      period_month: parseInt(row.period_month),
      pay_period_start: row.pay_period_start,
      pay_period_end: row.pay_period_end,
      payment_date: row.payment_date,
      run_name: row.run_name,
      run_type: row.run_type,
      status: row.status,
      total_employees: row.total_employees ? parseInt(row.total_employees) : 0,
      total_gross: row.total_gross ? parseFloat(row.total_gross) : 0,
      total_deductions: row.total_deductions ? parseFloat(row.total_deductions) : 0,
      total_net: row.total_net ? parseFloat(row.total_net) : 0,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
    });
  }

  async findByPeriod(year: number, month: number, organizationId: string, runType?: string): Promise<PayrollRun | null> {
    const conditions = ['period_year = $1', 'period_month = $2', 'organization_id = $3', 'is_deleted = FALSE'];
    const values: any[] = [year, month, organizationId];
    
    if (runType) {
      conditions.push(`run_type = $4`);
      values.push(runType);
    }
    
    const query = `
      SELECT *
      FROM payroll_runs
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return new PayrollRun({
      payroll_run_id: row.payroll_run_id,
      organization_id: row.organization_id,
      company_id: row.company_id,
      period_year: parseInt(row.period_year),
      period_month: parseInt(row.period_month),
      pay_period_start: row.pay_period_start,
      pay_period_end: row.pay_period_end,
      payment_date: row.payment_date,
      run_name: row.run_name,
      run_type: row.run_type,
      status: row.status,
      total_employees: row.total_employees ? parseInt(row.total_employees) : 0,
      total_gross: row.total_gross ? parseFloat(row.total_gross) : 0,
      total_deductions: row.total_deductions ? parseFloat(row.total_deductions) : 0,
      total_net: row.total_net ? parseFloat(row.total_net) : 0,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
    });
  }

  async findAll(
    organizationId: string,
    filters?: { status?: string; year?: number; month?: number; page?: number; limit?: number }
  ): Promise<{ runs: PayrollRun[]; total: number }> {
    const conditions: string[] = ['organization_id = $1', 'is_deleted = FALSE'];
    const values: any[] = [organizationId];
    let paramIndex = 2;
    
    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters?.year) {
      conditions.push(`period_year = $${paramIndex++}`);
      values.push(filters.year);
    }
    
    if (filters?.month) {
      conditions.push(`period_month = $${paramIndex++}`);
      values.push(filters.month);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM payroll_runs WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    
    // Get paginated results
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT *
      FROM payroll_runs
      WHERE ${whereClause}
      ORDER BY period_year DESC, period_month DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    values.push(limit, offset);
    const result = await this.pool.query(query, values);
    
    const runs = result.rows.map(row => new PayrollRun({
      payroll_run_id: row.payroll_run_id,
      organization_id: row.organization_id,
      company_id: row.company_id,
      period_year: parseInt(row.period_year),
      period_month: parseInt(row.period_month),
      pay_period_start: row.pay_period_start,
      pay_period_end: row.pay_period_end,
      payment_date: row.payment_date,
      run_name: row.run_name,
      run_type: row.run_type,
      status: row.status,
      total_employees: row.total_employees ? parseInt(row.total_employees) : 0,
      total_gross: row.total_gross ? parseFloat(row.total_gross) : 0,
      total_deductions: row.total_deductions ? parseFloat(row.total_deductions) : 0,
      total_net: row.total_net ? parseFloat(row.total_net) : 0,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
    }));
    
    return { runs, total };
  }

  async create(payrollRun: PayrollRun): Promise<PayrollRun> {
    const data = payrollRun.toJSON();
    const query = `
      INSERT INTO payroll_runs (
        payroll_run_id, organization_id, period_year, period_month,
        pay_period_start, pay_period_end, run_name, run_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.payroll_run_id,
      data.organization_id,
      data.period_year,
      data.period_month,
      data.pay_period_start,
      data.pay_period_end,
      data.run_name,
      data.run_type,
      data.status
    ];

    await this.pool.query(query, values);
    return payrollRun;
  }

  async update(payrollRunId: string, organizationId: string, data: Partial<PayrollRun>): Promise<PayrollRun> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic update query based on provided fields
    const dataJson = data as any;
    
    if (dataJson.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dataJson.status);
    }
    
    if (dataJson.payment_date !== undefined) {
      updates.push(`payment_date = $${paramIndex++}`);
      values.push(dataJson.payment_date);
    }
    
    if (dataJson.total_employees !== undefined) {
      updates.push(`total_employees = $${paramIndex++}`);
      values.push(dataJson.total_employees);
    }
    
    if (dataJson.total_gross !== undefined) {
      updates.push(`total_gross = $${paramIndex++}`);
      values.push(dataJson.total_gross);
    }
    
    if (dataJson.total_deductions !== undefined) {
      updates.push(`total_deductions = $${paramIndex++}`);
      values.push(dataJson.total_deductions);
    }
    
    if (dataJson.total_net !== undefined) {
      updates.push(`total_net = $${paramIndex++}`);
      values.push(dataJson.total_net);
    }
    
    if (dataJson.processed_by !== undefined) {
      updates.push(`processed_by = $${paramIndex++}`);
      values.push(dataJson.processed_by);
    }
    
    if (dataJson.processed_at !== undefined) {
      updates.push(`processed_at = $${paramIndex++}`);
      values.push(dataJson.processed_at);
    }
    
    if (dataJson.approved_by !== undefined) {
      updates.push(`approved_by = $${paramIndex++}`);
      values.push(dataJson.approved_by);
    }
    
    if (dataJson.approved_at !== undefined) {
      updates.push(`approved_at = $${paramIndex++}`);
      values.push(dataJson.approved_at);
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    updates.push(`modified_at = NOW()`);
    
    const query = `
      UPDATE payroll_runs
      SET ${updates.join(', ')}
      WHERE payroll_run_id = $${paramIndex++}
        AND organization_id = $${paramIndex++}
        AND is_deleted = FALSE
      RETURNING *
    `;
    
    values.push(payrollRunId, organizationId);
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Payroll run not found');
    }
    
    const row = result.rows[0];
    return new PayrollRun({
      payroll_run_id: row.payroll_run_id,
      organization_id: row.organization_id,
      company_id: row.company_id,
      period_year: parseInt(row.period_year),
      period_month: parseInt(row.period_month),
      pay_period_start: row.pay_period_start,
      pay_period_end: row.pay_period_end,
      payment_date: row.payment_date,
      run_name: row.run_name,
      run_type: row.run_type,
      status: row.status,
      total_employees: row.total_employees ? parseInt(row.total_employees) : 0,
      total_gross: row.total_gross ? parseFloat(row.total_gross) : 0,
      total_deductions: row.total_deductions ? parseFloat(row.total_deductions) : 0,
      total_net: row.total_net ? parseFloat(row.total_net) : 0,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
    });
  }

  async delete(payrollRunId: string, organizationId: string): Promise<boolean> {
    const query = `
      UPDATE payroll_runs
      SET is_deleted = TRUE, modified_at = NOW()
      WHERE payroll_run_id = $1
        AND organization_id = $2
        AND is_deleted = FALSE
    `;
    
    const result = await this.pool.query(query, [payrollRunId, organizationId]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

// =====================================================
// EVENT OUTBOX REPOSITORY
// =====================================================

export class EventOutboxRepository implements IEventOutboxRepository {
  constructor(private pool: Pool) {}

  async create(event: {
    organization_id: string;
    event_type: string;
    event_name: string;
    aggregate_type: string;
    aggregate_id: string;
    payload: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const query = `
      INSERT INTO events_outbox (
        organization_id, event_type, event_name, aggregate_type,
        aggregate_id, payload, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING event_id
    `;
    
    const values = [
      event.organization_id,
      event.event_type,
      event.event_name,
      event.aggregate_type,
      event.aggregate_id,
      JSON.stringify(event.payload),
      JSON.stringify(event.metadata || {})
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].event_id;
  }

  async findPendingEvents(limit = 100): Promise<any[]> {
    const query = `
      SELECT 
        event_id,
        organization_id,
        event_type,
        event_name,
        aggregate_type,
        aggregate_id,
        payload,
        metadata,
        retry_count
      FROM events_outbox
      WHERE status = 'pending'
        AND retry_count < 5
      ORDER BY created_at ASC
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    
    return result.rows.map(row => ({
      event_id: row.event_id,
      organization_id: row.organization_id,
      event_type: row.event_type,
      event_name: row.event_name,
      aggregate_type: row.aggregate_type,
      aggregate_id: row.aggregate_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      retry_count: parseInt(row.retry_count),
    }));
  }

  async markProcessed(eventId: string): Promise<void> {
    const query = `
      UPDATE events_outbox
      SET status = 'processed',
          processed_at = NOW(),
          modified_at = NOW()
      WHERE event_id = $1
    `;
    
    await this.pool.query(query, [eventId]);
  }

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE events_outbox
      SET status = 'failed',
          retry_count = retry_count + 1,
          error_message = $2,
          modified_at = NOW()
      WHERE event_id = $1
    `;
    
    await this.pool.query(query, [eventId, errorMessage]);
  }
}

// =====================================================
// AUDIT LOG REPOSITORY
// =====================================================

export class AuditLogRepository implements IAuditLogRepository {
  constructor(private pool: Pool) {}

  async create(audit: {
    organization_id: string;
    user_id?: string;
    username?: string;
    ip_address?: string;
    user_agent?: string;
    entity_type: string;
    entity_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: Record<string, any>;
  }): Promise<string> {
    const query = `
      INSERT INTO audit_log (
        organization_id, user_id, username, ip_address, user_agent,
        entity_type, entity_id, action, old_values, new_values, changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING audit_id
    `;
    
    const values = [
      audit.organization_id,
      audit.user_id || null,
      audit.username || null,
      audit.ip_address || null,
      audit.user_agent || null,
      audit.entity_type,
      audit.entity_id,
      audit.action,
      audit.old_values ? JSON.stringify(audit.old_values) : null,
      audit.new_values ? JSON.stringify(audit.new_values) : null,
      audit.changes ? JSON.stringify(audit.changes) : null
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].audit_id;
  }

  async findByEntity(entityType: string, entityId: string, organizationId: string, limit = 50): Promise<any[]> {
    const query = `
      SELECT 
        audit_id,
        user_id,
        username,
        action,
        old_values,
        new_values,
        changes,
        created_at
      FROM audit_log
      WHERE entity_type = $1
        AND entity_id = $2
        AND organization_id = $3
      ORDER BY created_at DESC
      LIMIT $4
    `;
    
    const result = await this.pool.query(query, [entityType, entityId, organizationId, limit]);
    
    return result.rows.map(row => ({
      audit_id: row.audit_id,
      user_id: row.user_id,
      username: row.username,
      action: row.action,
      old_values: row.old_values,
      new_values: row.new_values,
      changes: row.changes,
      created_at: row.created_at,
    }));
  }

  async findByUser(userId: string, organizationId: string, filters?: any): Promise<any[]> {
    const conditions: string[] = ['user_id = $1', 'organization_id = $2'];
    const values: any[] = [userId, organizationId];
    let paramIndex = 3;
    
    if (filters?.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }
    
    if (filters?.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(filters.action);
    }
    
    if (filters?.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }
    
    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 100;
    
    const query = `
      SELECT 
        audit_id,
        user_id,
        username,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        changes,
        ip_address,
        user_agent,
        created_at
      FROM audit_log
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++}
    `;
    
    values.push(limit);
    const result = await this.pool.query(query, values);
    
    return result.rows.map(row => ({
      audit_id: row.audit_id,
      user_id: row.user_id,
      username: row.username,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      old_values: row.old_values,
      new_values: row.new_values,
      changes: row.changes,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
    }));
  }
}
